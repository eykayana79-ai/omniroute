import { Collapse, LockScreen, Notification, Phone, Stage, type Act } from "../../kit";
import "./clearance.css";

// Roselle RTW clearance sale, 9:16 for TikTok. A lock screen from the first
// minute of the sale: TikTok Shop order notifications for baju kurung drop in
// under the clock, faster and faster, each one pushing the last down past the
// stage's foot. The headline above says what the viewer is looking at.
//
// Real strings: the kicker, the headline, and each order (amount, the piece,
// its colour and size). Nothing else on screen carries words.

type S = { n: number; out: boolean };
const START: S = { n: 2, out: false };
// Four fit under the clock; an older one folds away as a new one lands
const SHOWN = 4;

const ORDERS = [
  { amount: "RM39.00", item: "Baju Kurung Dahlia · Dusty Pink, M", time: "now" },
  { amount: "RM45.00", item: "Kurung Pahang Seroja · Sage, L", time: "now" },
  { amount: "RM78.00", item: "Baju Kurung Dahlia · Navy, XL ×2", time: "now" },
  { amount: "RM35.00", item: "Kurung Kedah Melur · Cream, S", time: "now" },
  { amount: "RM39.00", item: "Baju Kurung Dahlia · Maroon, L", time: "now" },
  { amount: "RM90.00", item: "Kurung Pahang Seroja · Dusty Pink, M ×2", time: "now" },
];

// Arrivals speed up: the sale is picking up (the first two are on screen at the start)
const GAPS = [0, 0, 1100, 900, 750, 650];

const script = async (a: Act<S>) => {
  await a.wait(900);
  for (let i = 2; i < ORDERS.length; i++) {
    a.mark(`order-${i + 1}`);
    a.put({ n: i + 1 });
    await a.wait(GAPS[i]);
  }
  a.mark("payoff");
  await a.wait(2000);
  // Cleared from the lock screen, then the next minute's orders come in fresh
  a.put({ out: true });
  await a.wait(380);
  await a.snap({ n: 0, out: false });
  // The first orders of the next minute: back where the loop began
  a.put({ n: 1 });
  await a.wait(260);
  a.put({ n: 2 });
  await a.wait(100);
};

/** The TikTok app icon: the note glyph in white over its cyan and red offsets */
function TikTokIcon() {
  const d =
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";
  return (
    <span className="rc-tiktok" aria-hidden>
      <svg viewBox="-6 -6 36 36" width="38" height="38">
        <path d={d} fill="#25F4EE" transform="translate(-0.9 -0.9)" />
        <path d={d} fill="#FE2C55" transform="translate(0.9 0.9)" />
        <path d={d} fill="#fff" />
      </svg>
    </span>
  );
}

export default function RoselleClearance() {
  return (
    <div className="rc-page">
      <div className="rc-copy">
        <span className="rc-kicker">Clearance Sale · rosellertw</span>
        <div className="rc-title">Baru buka 5 minit, phone admin dah tak berhenti bunyi 😭</div>
      </div>
      <Stage<S>
        width={405}
        height={524}
        initial={START}
        play="loop"
        poster={{ n: 4, out: false }}
        script={script}
        className="rc"
      >
        {(s) => (
          <>
            <Phone
              width={361}
              frame="pro"
              dark
              wallpaper="linear-gradient(170deg, #f3b8c8 0%, #d98aa5 45%, #9c5a7a 100%)"
              time="12:05"
              className="rc-phone"
            >
              <LockScreen date="Jumaat, 21 November" time="12:05" stack="top" controls={false}>
                <div className="rc-stack" data-out={s.out || undefined}>
                  {ORDERS.map((_, k) => {
                    // Newest first: the last order to arrive sits under the clock
                    const i = ORDERS.length - 1 - k;
                    const o = ORDERS[i];
                    return (
                      <Collapse
                        key={i}
                        open={s.n > i && i >= s.n - SHOWN}
                        reveal="drop"
                        className="rc-item"
                      >
                        <div className="rc-exit" style={{ ["--k" as string]: s.n - 1 - i }}>
                          <Notification
                            icon={<TikTokIcon />}
                            title={`Pesanan baru · ${o.amount}`}
                            body={`${o.item} 🎉`}
                            time={o.time}
                          />
                        </div>
                      </Collapse>
                    );
                  })}
                </div>
              </LockScreen>
            </Phone>
          </>
        )}
      </Stage>
    </div>
  );
}
