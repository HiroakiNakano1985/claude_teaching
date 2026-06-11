import type { Config } from "tailwindcss";

// 「プロンプト道場」— 真面目さ(筆文字・朱印・段位)と温かみ(生成りの和紙色・だるま)を
// 両立する和風デザイン。20〜40代の男女が親しめる、ちょっと真面目で面白みのあるトーン。
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#2a2622", // 墨色(やや温かい黒)
          900: "#3a352f",
          700: "#5a534a",
          500: "#857d72",
          400: "#a89f93",
        },
        paper: "#f5f1e9", // 生成り(和紙)の背景
        line: "#e7e1d5", // 境界線
        // アクセント = 朱色(印・鳥居の色。温かく真面目)
        brand: {
          DEFAULT: "#c75b43",
          ink: "#9c4231", // 文字・リンク用
          dark: "#b04c38", // ボタン
          soft: "#f6e7e1", // 淡いタント
          tint: "#fbf3ef",
        },
        ai: "#2b4a6f", // 藍(段位の帯など二次アクセント)
        warnsoft: "#f6ecd9",
        warnink: "#9a6b15",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Segoe UI Variable",
          "Segoe UI",
          "Yu Gothic UI",
          "Noto Sans JP",
          "Meiryo",
          "sans-serif",
        ],
        brush: ["var(--font-brush)", "'Hiragino Mincho ProN'", "'Yu Mincho'", "serif"],
      },
      maxWidth: { screen: "30rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(60,40,20,0.05), 0 4px 16px -8px rgba(60,40,20,0.12)",
        lift: "0 2px 6px rgba(60,40,20,0.08), 0 12px 30px -12px rgba(60,40,20,0.18)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "stamp-in": {
          "0%": { opacity: "0", transform: "rotate(-6deg) scale(1.4)" },
          "60%": { opacity: "1", transform: "rotate(-6deg) scale(0.92)" },
          "100%": { opacity: "1", transform: "rotate(-6deg) scale(1)" },
        },
        // 「ドン」と押し込む大判スタンプ
        "stamp-slam": {
          "0%": { opacity: "0", transform: "rotate(-9deg) scale(2.5)" },
          "55%": { opacity: "1", transform: "rotate(-9deg) scale(0.84)" },
          "75%": { opacity: "1", transform: "rotate(-7deg) scale(1.08)" },
          "100%": { opacity: "1", transform: "rotate(-6deg) scale(1)" },
        },
        // スタンプ着弾時に外へ広がる朱の波紋
        "ring-out": {
          "0%": { opacity: "0.45", transform: "scale(0.35)" },
          "100%": { opacity: "0", transform: "scale(1.9)" },
        },
        "pop-in": { "0%": { opacity: "0", transform: "translateY(8px) scale(0.96)" }, "100%": { opacity: "1", transform: "translateY(0) scale(1)" } },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        "stamp-in": "stamp-in 0.45s cubic-bezier(0.2,0.8,0.2,1) both",
        "stamp-slam": "stamp-slam 0.55s cubic-bezier(0.18,0.9,0.12,1) both",
        "ring-out": "ring-out 0.75s ease-out both",
        "pop-in": "pop-in 0.35s ease-out both 0.45s",
      },
    },
  },
  plugins: [],
};

export default config;
