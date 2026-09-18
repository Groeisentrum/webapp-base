import styles from "./Events.module.css";

/** Simplified front elevation observed from https://afrikanergeskiedenis.co.za/wp-content/uploads/2025/07/Voortrekkermonument.jpg */
export function MonumentOutline() {
  return (
    <svg
      className={styles.monumentOutline}
      viewBox="100 75 800 480"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="monument-lattice"
          width="14"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M7 0 14 9 7 18 0 9Z M0 0 14 18 M14 0 0 18"
            strokeWidth=".7"
          />
        </pattern>
      </defs>
      <path d="M318 396 334 180 Q365 182 380 154 V102 H410 V98 H577 V102 H606 V154 Q622 182 653 180 L670 396 M380 154 H606 M335 190 H653 M334 195 H654" />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M${402 + i * 29} 154v-30h12v30`} />
      ))}
      <path d="M394 391V300a100 100 0 0 1 200 0v91 M416 366V302a78 78 0 0 1 156 0v64Z" />
      <path
        d="M416 366V302a78 78 0 0 1 156 0v64Z"
        fill="url(#monument-lattice)"
        strokeWidth="1"
      />
      <path d="M442 244v122m32-136v128m34-128v128m32-114v122 M470 391v-30l24-8 24 8v30 M479 387v-16h29v16" />
      {[210, 251, 292, 334, 376].map((y) => (
        <path
          key={y}
          d={`M${355 - (y - 210) * 0.03} ${y}v10 M${632 + (y - 210) * 0.02} ${y}v10`}
        />
      ))}
      <path d="M255 416v-20h215l8 33h33l8-33h214v20 M149 419l106-3 94 27v67 M149 419l-12 86h39 M255 416v61 M733 416l102 3 13 86h-45 M733 416v61 M678 417l-109 92 M678 417v61 M835 419l-97 24v67 M350 510h127v-12h36v12h57" />
      <path d="M185 506h148m-136-7h124m-112-7h100m-88-7h76m-64-7h52 M656 506h147m-135-7h123m-111-7h99m-87-7h75m-63-7h51" />
      <path d="M137 510h-16v7H99v8H78v7h273 M848 510h16v7h22v8h21v7H635 M350 510v7H333v8H317v7 M638 510v7h17v8h17v7" />
      <path
        d="M339 402h48v31h-48Z M394 392h47v29h-47Z M549 392h47v29h-47Z M602 402h48v31h-48Z"
        strokeWidth="1"
      />
      <path d="M120 545h760" strokeWidth="1" />
    </svg>
  );
}
