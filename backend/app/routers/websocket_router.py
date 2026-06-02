"""
WebSocket router — real-time intervention delivery.

WS /ws/{session_id}
    Frontend connects once per session (from TrackerProvider).
    trigger_service calls manager.send_intervention_sync() after an intervention fires.

ConnectionManager.send_intervention_sync() is thread-safe: it uses
asyncio.run_coroutine_threadsafe() to schedule the async send from the
BackgroundTask thread pool onto the main uvicorn event loop.
"""

import asyncio
import logging
from typing import Dict, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Tracks active WebSocket connections keyed by session_id."""

    def __init__(self) -> None:
        self._connections: Dict[str, WebSocket] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    # ── called once at startup from lifespan ──────────────────────────────────

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Store the main event loop so background threads can schedule sends."""
        self._loop = loop

    # ── async helpers (called from within the event loop) ────────────────────

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[session_id] = websocket
        logger.info(
            "WS: session %s connected (%d active)", session_id, len(self._connections)
        )

    def disconnect(self, session_id: str) -> None:
        self._connections.pop(session_id, None)
        logger.info(
            "WS: session %s disconnected (%d active)", session_id, len(self._connections)
        )

    async def send_intervention(self, session_id: str, data: dict) -> bool:
        """Send JSON payload to the connected session. Returns True on success."""
        ws = self._connections.get(session_id)
        if not ws:
            logger.debug("WS: no active connection for session %s", session_id)
            return False
        try:
            await ws.send_json(data)
            logger.info("WS: intervention delivered to session %s", session_id)
            return True
        except Exception as exc:
            logger.warning("WS: send failed for session %s: %s", session_id, exc)
            self.disconnect(session_id)
            return False

    # ── sync helper (called from BackgroundTask threads) ─────────────────────

    def send_intervention_sync(self, session_id: str, data: dict) -> None:
        """
        Thread-safe: schedule an intervention send from a synchronous context.
        No-op if the event loop hasn't been set yet or no client is connected.
        """
        if not self._loop:
            logger.debug("WS: event loop not set — skipping intervention push")
            return
        if session_id not in self._connections:
            logger.debug(
                "WS: session %s not connected — intervention not pushed", session_id
            )
            return
        asyncio.run_coroutine_threadsafe(
            self.send_intervention(session_id, data), self._loop
        )


# ── Singleton ─────────────────────────────────────────────────────────────────
manager = ConnectionManager()


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(session_id: str, websocket: WebSocket) -> None:
    """
    Persistent WebSocket connection for a session.
    Frontend connects on mount and listens for intervention messages.
    """
    await manager.connect(session_id, websocket)
    try:
        while True:
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(session_id)
