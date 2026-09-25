import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="stars" />

      <svg
        className="creature"
        viewBox="0 0 220 220"
        width="220"
        height="220"
        aria-label="A confused wobbly blob creature"
      >
        {/* floating shadow */}
        <ellipse className="shadow" cx="110" cy="195" rx="55" ry="10" />

        {/* antenna */}
        <line x1="90" y1="55" x2="82" y2="25" stroke="#7c5cff" strokeWidth="4" strokeLinecap="round" />
        <circle className="antenna-tip" cx="82" cy="20" r="7" fill="#ffd166" />

        <line x1="130" y1="55" x2="140" y2="22" stroke="#7c5cff" strokeWidth="4" strokeLinecap="round" />
        <circle className="antenna-tip antenna-tip2" cx="140" cy="17" r="6" fill="#ff6b9d" />

        {/* body */}
        <path
          className="body"
          d="M110 60
             C 60 60, 40 100, 45 140
             C 48 175, 80 195, 110 195
             C 140 195, 172 175, 175 140
             C 180 100, 160 60, 110 60 Z"
          fill="#7c5cff"
        />

        {/* belly */}
        <ellipse cx="110" cy="150" rx="38" ry="24" fill="#a888ff" />

        {/* legs */}
        <ellipse className="leg leg-left" cx="70" cy="188" rx="12" ry="8" fill="#5e3fd6" />
        <ellipse className="leg leg-right" cx="150" cy="188" rx="12" ry="8" fill="#5e3fd6" />

        {/* eyes */}
        <g className="eyes">
          <circle cx="85" cy="105" r="18" fill="white" />
          <circle cx="135" cy="105" r="18" fill="white" />
          <circle className="pupil pupil-left" cx="88" cy="108" r="8" fill="#222" />
          <circle className="pupil pupil-right" cx="132" cy="108" r="8" fill="#222" />
        </g>

        {/* confused squiggly mouth */}
        <path
          className="mouth"
          d="M90 140 Q100 150, 110 140 T130 140"
          stroke="#3a2a7a"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />

        {/* little sweat drop */}
        <path className="sweat" d="M160 90 C160 90, 168 100, 168 106 C168 111, 164 114, 160 114 C156 114, 152 111, 152 106 C152 100, 160 90, 160 90 Z" fill="#8ecbff" />
      </svg>

      <h1 className="code">404</h1>
      <h2 className="title">Uh oh, this page wandered off</h2>
      <p className="subtitle">
        Whatever you were looking for isn&apos;t here — maybe our little
        friend above ate it.
      </p>

      <Link href="/" className="home-btn">
        Take me home
      </Link>

      <style>{`
        .wrap {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          overflow: hidden;
          background: radial-gradient(circle at 50% 20%, #251a4a 0%, #14102b 60%, #0c0920 100%);
          color: #f2f0ff;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.6), transparent),
            radial-gradient(2px 2px at 80% 20%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1.5px 1.5px at 60% 70%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1.5px 1.5px at 30% 80%, rgba(255,255,255,0.5), transparent),
            radial-gradient(2px 2px at 90% 60%, rgba(255,255,255,0.4), transparent);
          background-repeat: repeat;
          background-size: 300px 300px;
          opacity: 0.7;
          pointer-events: none;
        }

        .creature {
          animation: float 3s ease-in-out infinite;
          margin-bottom: 8px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-14px) rotate(1deg); }
        }

        .shadow {
          fill: rgba(0,0,0,0.35);
          animation: shrink 3s ease-in-out infinite;
        }
        @keyframes shrink {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(0.8); opacity: 0.2; }
        }

        .antenna-tip {
          animation: blink-glow 2s ease-in-out infinite;
          transform-origin: center;
        }
        .antenna-tip2 {
          animation-delay: 0.4s;
        }
        @keyframes blink-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .pupil {
          animation: look-around 4s ease-in-out infinite;
        }
        @keyframes look-around {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(4px, -2px); }
          40% { transform: translate(-4px, 2px); }
          60% { transform: translate(0, 3px); }
          80% { transform: translate(2px, -1px); }
        }

        .mouth {
          animation: wobble-mouth 2.5s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes wobble-mouth {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.85); }
        }

        .leg-left {
          animation: leg-tap 1.2s ease-in-out infinite;
          transform-origin: 70px 188px;
        }
        .leg-right {
          animation: leg-tap 1.2s ease-in-out infinite 0.6s;
          transform-origin: 150px 188px;
        }
        @keyframes leg-tap {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .sweat {
          animation: drip 2s ease-in infinite;
        }
        @keyframes drip {
          0% { transform: translateY(0); opacity: 1; }
          80% { transform: translateY(10px); opacity: 0.2; }
          100% { transform: translateY(10px); opacity: 0; }
        }

        .code {
          font-size: clamp(48px, 10vw, 88px);
          font-weight: 800;
          margin: 4px 0 0;
          background: linear-gradient(90deg, #ff6b9d, #7c5cff, #8ecbff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: 2px;
        }

        .title {
          font-size: clamp(18px, 3vw, 26px);
          margin: 8px 0 4px;
          font-weight: 600;
        }

        .subtitle {
          max-width: 380px;
          color: #b8b0e0;
          font-size: 15px;
          line-height: 1.5;
          margin: 0 0 24px;
        }

        .home-btn {
          display: inline-block;
          padding: 12px 28px;
          border-radius: 999px;
          background: linear-gradient(90deg, #7c5cff, #ff6b9d);
          color: white;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(124, 92, 255, 0.35);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .home-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 28px rgba(124, 92, 255, 0.5);
        }
      `}</style>
    </div>
  );
}