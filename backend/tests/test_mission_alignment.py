"""
Mission alignment scoring tests.
"""

import pytest
from uuid import uuid4
from datetime import datetime, timezone
from app.models.models import Session, Event, Product, Order, OrderItem

def create_product(db_session, category):
    p = Product(product_id=uuid4(), name=f"Test {category}", category=category, price=100)
    db_session.add(p)
    db_session.commit()
    return p

def setup_session_events(db_session, user, session_id, visited_categories, purchased_category=None, event_count=20):
    # setup session
    s = Session(session_id=session_id, customer_id=user.customer_id)
    db_session.add(s)
    db_session.commit()

    products = []
    for cat in visited_categories:
        products.append(create_product(db_session, cat))
    
    # insert events
    for i in range(event_count):
        prod = products[i % len(products)] if products else None
        evt = Event(
            event_id=uuid4(),
            session_id=session_id,
            customer_id=user.customer_id,
            event_type="view",
            product_id=prod.product_id if prod else None
        )
        db_session.add(evt)
    
    if purchased_category:
        purchased_prod = create_product(db_session, purchased_category)
        
        # Add 'order_completed' event
        evt_order = Event(
            event_id=uuid4(),
            session_id=session_id,
            customer_id=user.customer_id,
            event_type="order_completed",
            product_id=purchased_prod.product_id
        )
        db_session.add(evt_order)

        # Create the order
        order = Order(order_id=uuid4(), customer_id=user.customer_id, total=100)
        db_session.add(order)
        db_session.flush()
        
        order_item = OrderItem(order_id=order.order_id, product_id=purchased_prod.product_id, quantity=1, unit_price=100)
        db_session.add(order_item)
        
    db_session.commit()
    return s

def test_mission_alignment_replacement_buys_phone(auth_client, db_session, test_user):
    test_user.scenario_id = "A_replacement"
    db_session.commit()
    
    session_id = uuid4()
    setup_session_events(db_session, test_user, session_id, ["phones", "accessories"], purchased_category="phones", event_count=20)
    
    response = auth_client.post(f"/events/sessions/{session_id}/close")
    assert response.status_code == 200
    
    db_session.refresh(test_user)
    session = db_session.query(Session).filter(Session.session_id == session_id).first()
    assert session.mission_alignment_score == 1.0

def test_mission_alignment_replacement_buys_laptop(auth_client, db_session, test_user):
    test_user.scenario_id = "A_replacement"
    db_session.commit()
    
    session_id = uuid4()
    setup_session_events(db_session, test_user, session_id, ["laptops"], purchased_category="laptops", event_count=15)
    
    response = auth_client.post(f"/events/sessions/{session_id}/close")
    assert response.status_code == 200
    
    session = db_session.query(Session).filter(Session.session_id == session_id).first()
    assert session.mission_alignment_score == 0.3

def test_mission_alignment_browse_high_engagement(auth_client, db_session, test_user):
    test_user.scenario_id = "D_browse"
    db_session.commit()
    
    session_id = uuid4()
    setup_session_events(db_session, test_user, session_id, ["phones", "laptops", "headphones"], purchased_category=None, event_count=30)
    
    response = auth_client.post(f"/events/sessions/{session_id}/close")
    assert response.status_code == 200
    
    session = db_session.query(Session).filter(Session.session_id == session_id).first()
    assert session.mission_alignment_score == 1.0
