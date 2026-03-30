from app import create_app, db
from config import get_config
from sqlalchemy import text

app = create_app(get_config())

with app.app_context():
    print("=== VBL_CONTRACT_PAYMENT ===")
    res1 = db.session.execute(text("SELECT * FROM vbl_contract_payment LIMIT 1"))
    if res1.returns_rows:
        print(res1.keys())
    
    print("=== VBF_CONTRACT_PAYMENT ===")
    res2 = db.session.execute(text("SELECT * FROM vbf_contract_payment LIMIT 1"))
    if res2.returns_rows:
        print(res2.keys())
