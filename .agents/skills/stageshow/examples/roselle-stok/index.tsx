import { Badge, Button, Count, Meter, Phone, Stage, type Act } from "../../kit";
import "./stok.css";

// Roselle RTW clearance sale, 9:16 for TikTok. A product page on a phone: the
// stock line counts down, the sizes sell out one by one, and the button turns
// into "Habis dijual". The headline above asks the question; the page answers.
//
// Real strings: the headline, the product name, its price (new, old, saving),
// the stock line, four sizes, the button. Everything else is shape.

type S = { stock: number; gone: string[]; sold: boolean; veil: boolean };
const START: S = { stock: 48, gone: [], sold: false, veil: false };
const SIZES = ["S", "M", "L", "XL"];
const TOTAL = 50;

const script = async (a: Act<S>) => {
  await a.wait(1400);
  a.mark("drop-1");
  a.put({ stock: 31 });
  await a.wait(1300);
  a.put({ stock: 17, gone: ["XL"] });
  await a.wait(1300);
  a.put({ stock: 9, gone: ["XL", "S"] });
  await a.wait(1200);
  a.mark("last");
  a.put({ stock: 3, gone: ["XL", "S", "M"] });
  await a.wait(1400);
  a.mark("payoff");
  a.put({ stock: 0, gone: ["XL", "S", "M", "L"], sold: true });
  await a.wait(2400);
  // The page lifts away, the next sale's page comes in fresh
  a.put({ veil: true });
  await a.wait(450);
  await a.snap({ ...START, veil: true });
  await a.wait(100);
  a.put({ veil: false });
  await a.wait(500);
};

export default function RoselleStok() {
  return (
    <div className="rs-page">
      <div className="rs-copy">
        <span className="rs-kicker">Clearance Sale · rosellertw</span>
        <div className="rs-title">Tinggal berapa helai lagi? 😳</div>
      </div>
      <Stage<S>
        width={405}
        height={524}
        initial={START}
        play="loop"
        accent="#c94f7c"
        poster={{ stock: 3, gone: ["XL", "S", "M"], sold: false, veil: false }}
        script={script}
        className="rs"
      >
        {(s) => (
          <Phone width={361} frame="pro" className="rs-phone">
            <div className="rs-app">
              <div className="rs-photo" />
              <div className="rs-body" data-veil={s.veil || undefined}>
                <div className="rs-name">Dahliah Mom Kurung Kedah</div>
                <div className="rs-price">
                  <span className="rs-now">RM179.10</span>
                  <span className="rs-was">RM329.00</span>
                  <Badge tone="danger">-46%</Badge>
                </div>

                <div className="rs-stock">
                  <div className="rs-stock__line">
                    <span>Tinggal</span>
                    <Count
                      className="rs-stock__n"
                      value={s.stock}
                      format={(n) => String(Math.round(n)).padStart(2, "0")}
                    />
                    <span>helai</span>
                  </div>
                  <Meter
                    value={s.stock / TOTAL}
                    tone={s.stock <= 10 ? "danger" : s.stock <= 20 ? "warning" : "accent"}
                    className="rs-meter"
                  />
                </div>

                <div className="rs-sizes">
                  {SIZES.map((z) => (
                    <Button
                      key={z}
                      variant="secondary"
                      size="medium"
                      className="rs-size"
                      data-gone={s.gone.includes(z) || undefined}
                    >
                      {z}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="large"
                  className="rs-buy"
                  data-sold={s.sold || undefined}
                >
                  {s.sold ? "Habis dijual" : "Beli sekarang"}
                </Button>
              </div>
            </div>
          </Phone>
        )}
      </Stage>
    </div>
  );
}
