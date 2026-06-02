"""
LangGraph-based Autonomous Agent for Customer Experience
Implements the 4-phase decision workflow
"""

from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
import os
from schemas import UserSegment, ActionType
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    """
    Shared state across all agent nodes
    Represents the complete context for decision-making
    """
    # Input from ML models
    intent_score: float  # 0.0-1.0, probability of cart abandonment
    user_segment: str  # Customer behavioral segment
    cart_value: float  # Total value in shopping cart
    session_history: list  # Last 5 events for context
    
    # Agent decision state
    intervention_status: bool  # Has intervention been deployed?
    current_action: str  # Selected action type
    generated_message: str  # LLM-generated personalized message
    
    # Metadata
    session_id: str
    user_id: str


class CustomerExperienceAgent:
    """
    Autonomous agent that analyzes user behavior and deploys interventions
    Uses LangGraph for state machine orchestration
    """
    
    def __init__(
        self,
        gemini_api_key: str,
        risk_threshold: float = 0.70,
        temperature: float = 0.7
    ):
        """
        Initialize the agent with LLM and configuration
        
        Args:
            gemini_api_key: API key for Google Gemini
            risk_threshold: Intent score threshold for triggering intervention (0.0-1.0)
            temperature: LLM temperature for message generation
        """
        self.risk_threshold = risk_threshold
        
        # Initialize Gemini LLM
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=gemini_api_key,
            temperature=temperature
        )
        
        # Segment to action mapping
        self.action_mapping = {
            UserSegment.PRICE_ORIENTED.value: ActionType.DYNAMIC_DISCOUNT.value,
            UserSegment.INDECISIVE.value: ActionType.SOCIAL_PROOF.value,
            UserSegment.INFORMATION_SEEKING.value: ActionType.INFO_GUIDE.value,
            UserSegment.LOYAL.value: ActionType.LOYALTY_REWARD.value,
            UserSegment.BROWSER.value: ActionType.GENERIC_REMINDER.value
        }
        
        # Message generation prompts per action type
        self.prompt_templates = {
            ActionType.DYNAMIC_DISCOUNT.value: """You are a helpful e-commerce assistant. Create a brief, friendly discount message.

Customer Profile:
- Segment: {segment} (price-sensitive shopper)
- Cart Value: ${cart_value:.2f}

Generate a personalized discount message (under 25 words) that:
- Offers a 5-10% discount
- Creates urgency without being pushy
- Sounds natural and friendly

Message:""",
            
            ActionType.SOCIAL_PROOF.value: """You are a helpful e-commerce assistant. Create a brief social proof message.

Customer Profile:
- Segment: {segment} (needs reassurance)
- Cart Value: ${cart_value:.2f}

Generate a social proof message (under 25 words) that:
- Mentions current shoppers viewing/buying (use realistic numbers like 3-7 people)
- Creates FOMO without being manipulative
- Sounds natural and helpful

Message:""",
            
            ActionType.INFO_GUIDE.value: """You are a helpful e-commerce assistant. Create a brief information offer.

Customer Profile:
- Segment: {segment} (information seeker)
- Cart Value: ${cart_value:.2f}

Generate a helpful message (under 25 words) that:
- Offers additional product information or buying guide
- Addresses common questions
- Sounds knowledgeable and supportive

Message:""",
            
            ActionType.LOYALTY_REWARD.value: """You are a helpful e-commerce assistant. Create a brief loyalty appreciation message.

Customer Profile:
- Segment: {segment} (valued returning customer)
- Cart Value: ${cart_value:.2f}

Generate a loyalty message (under 25 words) that:
- Thanks them for being a valued customer
- Hints at a small bonus or priority shipping
- Sounds genuine and appreciative

Message:""",
            
            ActionType.GENERIC_REMINDER.value: """You are a helpful e-commerce assistant. Create a brief cart reminder.

Customer Profile:
- Segment: {segment}
- Cart Value: ${cart_value:.2f}

Generate a gentle reminder message (under 25 words) that:
- Mentions items waiting in cart
- Offers assistance if needed
- Sounds helpful, not pushy

Message:"""
        }
    
    # ==================== NODE 1: RISK ANALYSIS ====================
    
    def analyze_risk_node(self, state: AgentState) -> AgentState:
        """
        Phase 1: Analyze abandonment risk
        
        Decision Logic:
        - If intent_score > threshold AND no intervention sent → Proceed to action
        - Otherwise → End (monitoring mode)
        """
        intent_score = state['intent_score']
        intervention_status = state['intervention_status']
        
        logger.info(f"[ANALYZE RISK] Session: {state['session_id']}")
        logger.info(f"[ANALYZE RISK] Intent Score: {intent_score:.3f} (Threshold: {self.risk_threshold})")
        logger.info(f"[ANALYZE RISK] Intervention Status: {intervention_status}")
        
        if intent_score > self.risk_threshold and not intervention_status:
            logger.info("[ANALYZE RISK] ⚠️  High abandonment risk detected → Proceeding to intervention")
        else:
            if intervention_status:
                logger.info("[ANALYZE RISK] ✓ Intervention already sent → Monitoring mode")
            else:
                logger.info("[ANALYZE RISK] ✓ Low risk → Monitoring mode")
        
        return state
    
    # ==================== NODE 2: ACTION DECISION ====================
    
    def decide_action_node(self, state: AgentState) -> AgentState:
        """
        Phase 2: Decide intervention type based on user segment
        
        Uses rule-based mapping: Segment → Action
        """
        segment = state['user_segment']
        
        # Map segment to action
        action = self.action_mapping.get(segment, ActionType.GENERIC_REMINDER.value)
        
        state['current_action'] = action
        
        logger.info(f"[DECIDE ACTION] Segment: {segment}")
        logger.info(f"[DECIDE ACTION] Selected Action: {action}")
        
        return state
    
    # ==================== NODE 3: MESSAGE GENERATION ====================
    
    def format_message_node(self, state: AgentState) -> AgentState:
        """
        Phase 3: Generate personalized message using LLM
        
        Uses Gemini to create context-aware, segment-specific message
        """
        action = state['current_action']
        segment = state['user_segment']
        cart_value = state['cart_value']
        
        logger.info(f"[FORMAT MESSAGE] Generating message for action: {action}")
        
        # Get appropriate prompt template
        prompt_template = self.prompt_templates.get(
            action,
            self.prompt_templates[ActionType.GENERIC_REMINDER.value]
        )
        
        # Format prompt with current context
        prompt = prompt_template.format(
            segment=segment,
            cart_value=cart_value
        )
        
        try:
            # Call Gemini API
            messages = [
                SystemMessage(content="You are a concise, friendly e-commerce assistant."),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm.invoke(messages)
            message = response.content.strip()
            
            # Clean up any extra formatting
            message = message.replace('"', '').replace("'", "").strip()
            
            # Truncate if too long
            if len(message.split()) > 30:
                words = message.split()[:25]
                message = ' '.join(words) + '...'
            
            state['generated_message'] = message
            logger.info(f"[FORMAT MESSAGE] Generated: '{message}'")
            
        except Exception as e:
            logger.error(f"[FORMAT MESSAGE] Error generating message: {e}")
            # Fallback to generic message
            state['generated_message'] = "Your items are waiting in your cart. Complete your purchase today!"
        
        return state
    
    # ==================== NODE 4: INTERVENTION EXECUTION ====================
    
    def execute_intervention_node(self, state: AgentState) -> AgentState:
        """
        Phase 4: Deploy intervention to user
        
        In production, this would:
        - Send message to frontend via WebSocket/API
        - Log intervention for A/B testing
        - Update analytics
        """
        message = state['generated_message']
        session_id = state['session_id']
        action = state['current_action']
        
        logger.info(f"[EXECUTE INTERVENTION] Session: {session_id}")
        logger.info(f"[EXECUTE INTERVENTION] Action: {action}")
        logger.info(f"[EXECUTE INTERVENTION] Message: '{message}'")
        
        # Update state
        state['intervention_status'] = True
        
        # TODO: In production, send to frontend
        # await websocket_manager.send_intervention(session_id, {
        #     'type': action,
        #     'message': message,
        #     'timestamp': datetime.now().isoformat()
        # })
        
        logger.info("[EXECUTE INTERVENTION] ✓ Intervention deployed successfully")
        
        return state
    
    # ==================== CONDITIONAL EDGE ====================
    
    def should_intervene(self, state: AgentState) -> Literal["decide_action", "end"]:
        """
        Conditional routing logic
        
        Routes to:
        - "decide_action" if high risk and no intervention
        - "end" otherwise (low risk or intervention already sent)
        """
        intent_score = state['intent_score']
        intervention_status = state['intervention_status']
        
        if intent_score > self.risk_threshold and not intervention_status:
            return "decide_action"
        else:
            return "end"
    
    # ==================== GRAPH CONSTRUCTION ====================
    
    def build_graph(self) -> StateGraph:
        """
        Build the complete LangGraph state machine
        
        Graph Structure:
        START → analyze_risk → [conditional] → decide_action → format_message → execute_intervention → END
                              └─ (low risk) ─→ END
        """
        # Initialize graph
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("analyze_risk", self.analyze_risk_node)
        workflow.add_node("decide_action", self.decide_action_node)
        workflow.add_node("format_message", self.format_message_node)
        workflow.add_node("execute_intervention", self.execute_intervention_node)
        
        # Set entry point
        workflow.set_entry_point("analyze_risk")
        
        # Add conditional edge from analyze_risk
        workflow.add_conditional_edges(
            "analyze_risk",
            self.should_intervene,
            {
                "decide_action": "decide_action",
                "end": END
            }
        )
        
        # Add sequential edges
        workflow.add_edge("decide_action", "format_message")
        workflow.add_edge("format_message", "execute_intervention")
        workflow.add_edge("execute_intervention", END)
        
        # Compile graph
        compiled_graph = workflow.compile()
        
        logger.info("[AGENT] ✓ LangGraph state machine compiled successfully")
        
        return compiled_graph
    
    def run(self, initial_state: dict) -> dict:
        """
        Execute the agent workflow
        
        Args:
            initial_state: Dictionary with intent_score, user_segment, cart_value, etc.
            
        Returns:
            Final state after agent execution
        """
        graph = self.build_graph()
        
        logger.info(f"\n{'='*60}")
        logger.info(f"[AGENT] Starting new session: {initial_state.get('session_id', 'unknown')}")
        logger.info(f"{'='*60}\n")
        
        # Execute graph
        result = graph.invoke(initial_state)
        
        logger.info(f"\n{'='*60}")
        logger.info(f"[AGENT] Session completed")
        logger.info(f"{'='*60}\n")
        
        return result


# ==================== EXAMPLE USAGE ====================

if __name__ == "__main__":
    # Initialize agent
    agent = CustomerExperienceAgent(
        gemini_api_key=os.getenv("GEMINI_API_KEY", "AIzaSyC2vEvFMzFHxBFv9Saw8ZdmaGYDFnbh61w"),
        risk_threshold=0.70
    )
    
    # Example 1: High-risk price-oriented customer
    print("\n" + "="*80)
    print("EXAMPLE 1: High-Risk Price-Oriented Customer")
    print("="*80)
    
    state1 = {
        'session_id': 'sess_001',
        'user_id': 'user_123',
        'intent_score': 0.85,  # High abandonment risk
        'user_segment': UserSegment.PRICE_ORIENTED.value,
        'cart_value': 129.99,
        'session_history': [
            {'event': 'product_view', 'time': '10:00'},
            {'event': 'add_to_cart', 'time': '10:05'},
            {'event': 'checkout_view', 'time': '10:10'},
        ],
        'intervention_status': False,
        'current_action': '',
        'generated_message': ''
    }
    
    result1 = agent.run(state1)
    print(f"\nFinal Message: {result1['generated_message']}")
    
    # Example 2: Low-risk loyal customer
    print("\n" + "="*80)
    print("EXAMPLE 2: Low-Risk Loyal Customer (No Intervention)")
    print("="*80)
    
    state2 = {
        'session_id': 'sess_002',
        'user_id': 'user_456',
        'intent_score': 0.35,  # Low abandonment risk
        'user_segment': UserSegment.LOYAL.value,
        'cart_value': 249.99,
        'session_history': [
            {'event': 'product_view', 'time': '11:00'},
            {'event': 'add_to_cart', 'time': '11:02'},
        ],
        'intervention_status': False,
        'current_action': '',
        'generated_message': ''
    }
    
    result2 = agent.run(state2)
    print(f"\nIntervention Sent: {result2['intervention_status']}")
