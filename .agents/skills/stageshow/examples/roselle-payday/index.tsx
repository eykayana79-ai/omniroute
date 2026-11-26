import { Badge, Button, Meter, Phone, Row, Stage } from "../../kit";
import "./payday.css";

// Draft still: the cart on a phone, one step short of the Payday free-kaftan
// threshold. RM179.10 is the real flash-sale price of the Dahliah kurung, so
// the nudge is real arithmetic: 200 - 179.10 = RM20.90.

const PRICE = 179.1;
const GOAL = 200;

export default function RoselleCart() {
  return (
    <div className="rp-page">
      <div className="rp-copy">
        <span className="rp-kicker">Payday Sale · 25–30 Nov</span>
        <div className="rp-title">
          Cukupkan RM200, <span className="rp-hl">kaftan</span> auto masuk 🎁
        </div>
      </div>
      <Stage width={405} height={524} accent="#e0488a" play="once" className="rp">
        {() => (
          <Phone width={361} frame="pro" className="rp-phone">
            <div className="rp-app">
              <div className="rp-nav">Troli (1)</div>
              <Row
                pad={14}
                lead={<span className="rp-thumb" />}
                title="Dahliah Mom Kurung Kedah"
                meta={`RM${PRICE.toFixed(2)}`}
              />
              <div className="rp-nudge">
                <div className="rp-nudge__text">
                  Tambah <b>RM{(GOAL - PRICE).toFixed(2)}</b> lagi, dapat <b>FREE KAFTAN</b> 🎁
                </div>
                <Meter value={PRICE / GOAL} tone="accent" className="rp-meter" />
              </div>
              <Row
                pad={14}
                lead={<span className="rp-gift">🎁</span>}
                title="Kaftan percuma"
                meta={<Badge tone="neutral">Belum cukup</Badge>}
              />
              <Button variant="primary" size="large" className="rp-buy">
                Checkout (1)
              </Button>
            </div>
          </Phone>
        )}
      </Stage>
    </div>
  );
}
