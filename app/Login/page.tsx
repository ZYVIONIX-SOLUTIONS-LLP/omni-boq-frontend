// "use client";

// import { useState } from "react";
// import {
//   Mail,
//   Lock,
//   Sun,
//   Moon,
//   Bell,
//   Settings,
//   User,
//   ShieldCheck,
//   Crown,
//   Eye,
//   EyeOff,
// } from "lucide-react";

// const ROLES = [
//   {
//     id: "staff",
//     label: "Staff Login",
//     icon: User,
//     tagline: "Access your daily tasks and schedule.",
//   },
//   {
//     id: "admin",
//     label: "Admin Login",
//     icon: ShieldCheck,
//     tagline: "Manage teams, projects, and permissions.",
//   },
//   {
//     id: "superadmin",
//     label: "Super Admin Login",
//     icon: Crown,
//     tagline: "Full control over the Planit workspace.",
//   },
// ];

// export default function PlanitLogin() {
//   const [role, setRole] = useState("staff");
//   const [theme, setTheme] = useState("light");
//   const [showPassword, setShowPassword] = useState(false);

//   const isDark = theme === "dark";
//   const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];

//   return (
//     <div
//       className={
//         "min-h-screen w-full flex items-center justify-center p-6 " +
//         (isDark ? "bg-[#0B0B18]" : "bg-[#EEEEF6]")
//       }
//     >
//       <div
//         className={
//           "relative w-full max-w-5xl overflow-hidden rounded-[28px] shadow-2xl " +
//           (isDark ? "bg-[#12101F]" : "bg-[#F4F4FA]")
//         }
//         style={{ minHeight: "680px" }}
//       >
//         {/* ---------- Decorative purple panel ---------- */}
//         <div className="absolute inset-y-0 left-0 w-full md:w-[56%] overflow-hidden">
//           <svg
//             viewBox="0 0 620 680"
//             preserveAspectRatio="none"
//             className="absolute inset-0 h-full w-full"
//           >
//             <defs>
//               <linearGradient id="purpleFill" x1="0" y1="0" x2="1" y2="1">
//                 <stop offset="0%" stopColor="#6C63FF" />
//                 <stop offset="100%" stopColor="#4B3FE4" />
//               </linearGradient>
//             </defs>
//             <path
//               d="M0,0 H620 V420 C 520,560 380,470 300,560 C 220,650 140,610 0,680 Z"
//               fill="url(#purpleFill)"
//             />
//           </svg>

//           {/* world map dots */}
//           <svg
//             viewBox="0 0 620 680"
//             className="absolute inset-0 h-full w-full opacity-30"
//           >
//             <g fill="#C7C2FF">
//               {Array.from({ length: 140 }).map((_, i) => {
//                 const x = (i * 37) % 520;
//                 const y = ((i * 53) % 420) + 30;
//                 const r = (i % 5 === 0) ? 2.4 : 1.3;
//                 return <circle key={i} cx={40 + x * 0.9} cy={y} r={r} />;
//               })}
//             </g>
//           </svg>

//           {/* network lines + nodes, bottom-left */}
//           <svg viewBox="0 0 400 300" className="absolute bottom-6 left-4 w-56 opacity-70">
//             <g stroke="#B7B0FF" strokeWidth="1">
//               <line x1="20" y1="240" x2="120" y2="160" />
//               <line x1="120" y1="160" x2="210" y2="200" />
//               <line x1="120" y1="160" x2="90" y2="60" />
//               <line x1="210" y1="200" x2="300" y2="120" />
//               <line x1="90" y1="60" x2="180" y2="20" />
//             </g>
//             <g fill="#E4E1FF">
//               <circle cx="20" cy="240" r="4" />
//               <circle cx="120" cy="160" r="5" />
//               <circle cx="210" cy="200" r="4" />
//               <circle cx="90" cy="60" r="4" />
//               <circle cx="300" cy="120" r="4" />
//               <circle cx="180" cy="20" r="3" />
//             </g>
//           </svg>

//           {/* clock icon */}
//           <div className="absolute top-16 left-[42%] hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
//             <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
//               <circle cx="12" cy="12" r="9" />
//               <path d="M12 7v5l3 2" strokeLinecap="round" />
//             </svg>
//           </div>

//           {/* chevrons */}
//           <svg viewBox="0 0 24 24" className="absolute bottom-24 left-[26%] h-6 w-6 text-white/60" fill="none" stroke="currentColor" strokeWidth="2">
//             <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
//           </svg>

//           <div className="absolute top-24 left-6 h-2 w-2 rounded-full bg-white/40" />
//           <div className="absolute bottom-40 left-16 h-2 w-2 rounded-full bg-emerald-300/70" />
//         </div>

//         {/* right side subtle squiggle */}
//         <svg viewBox="0 0 500 700" className="absolute right-0 top-0 h-full w-[48%] opacity-[0.08] pointer-events-none hidden md:block">
//           <path
//             d="M0,650 C120,600 160,520 260,540 C360,560 380,460 460,420"
//             fill="none"
//             stroke={isDark ? "#8B7CFF" : "#4B3FE4"}
//             strokeWidth="2"
//           />
//         </svg>

//         {/* ---------- Top-right controls ---------- */}
//         <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
//           <div
//             className={
//               "flex items-center rounded-full p-1 text-xs font-medium shadow-sm " +
//               (isDark ? "bg-[#1E1B33]" : "bg-white")
//             }
//           >
//             <button
//               onClick={() => setTheme("light")}
//               className={
//                 "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
//                 (!isDark ? "bg-[#4B3FE4] text-white" : "text-zinc-400")
//               }
//             >
//               <Sun className="h-3.5 w-3.5" /> Light
//             </button>
//             <button
//               onClick={() => setTheme("dark")}
//               className={
//                 "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
//                 (isDark ? "bg-[#4B3FE4] text-white" : "text-zinc-400")
//               }
//             >
//               <Moon className="h-3.5 w-3.5" /> Dark
//             </button>
//           </div>

//           <button
//             className={
//               "relative flex h-9 w-9 items-center justify-center rounded-full shadow-sm " +
//               (isDark ? "bg-[#1E1B33] text-zinc-300" : "bg-white text-zinc-500")
//             }
//           >
//             <Bell className="h-4 w-4" />
//             <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
//           </button>
//           <button
//             className={
//               "flex h-9 w-9 items-center justify-center rounded-full shadow-sm " +
//               (isDark ? "bg-[#1E1B33] text-zinc-300" : "bg-white text-zinc-500")
//             }
//           >
//             <Settings className="h-4 w-4" />
//           </button>
//         </div>

//         {/* ---------- Login card ---------- */}
//         <div className="relative z-10 flex min-h-[680px] items-center justify-center px-4 py-16 md:justify-end md:pr-[8%] md:pl-0">
//           <div
//             className={
//               "w-full max-w-md rounded-2xl px-8 py-9 shadow-xl sm:px-10 " +
//               (isDark ? "bg-[#171529] border border-white/5" : "bg-white")
//             }
//           >
//             {/* Logo */}
//             <div className="mb-6 flex flex-col items-center gap-1">
//               <div className="flex items-center gap-2">
//                 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#4B3FE4] text-white font-bold text-sm">
//                   P
//                 </div>
//                 <span className={"text-xl font-extrabold tracking-tight " + (isDark ? "text-white" : "text-[#1B1533]")}>
//                   PLAN<span className="text-[#6C63FF]">IT</span>
//                 </span>
//               </div>
//             </div>

//             <h1 className={"text-center text-2xl font-bold " + (isDark ? "text-white" : "text-[#1B1533]")}>
//               Welcome Back
//             </h1>
//             <p className={"mt-1 text-center text-sm " + (isDark ? "text-zinc-400" : "text-zinc-500")}>
//               Revolutionize the way you work.
//             </p>

//             {/* Role selector */}
//             <div
//               className={
//                 "mt-6 grid grid-cols-3 gap-1.5 rounded-xl p-1 " +
//                 (isDark ? "bg-[#1E1B33]" : "bg-[#F1F0FB]")
//               }
//             >
//               {ROLES.map((r) => {
//                 const Icon = r.icon;
//                 const active = role === r.id;
//                 return (
//                   <button
//                     key={r.id}
//                     type="button"
//                     onClick={() => setRole(r.id)}
//                     className={
//                       "flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-semibold leading-tight transition-all " +
//                       (active
//                         ? "bg-[#4B3FE4] text-white shadow-md shadow-[#4B3FE4]/30"
//                         : isDark
//                         ? "text-zinc-400 hover:text-zinc-200"
//                         : "text-zinc-500 hover:text-[#4B3FE4]")
//                     }
//                   >
//                     <Icon className="h-4 w-4" />
//                     {r.label.replace(" Login", "")}
//                   </button>
//                 );
//               })}
//             </div>
//             <p className={"mt-2 text-center text-xs " + (isDark ? "text-zinc-500" : "text-zinc-400")}>
//               {activeRole.tagline}
//             </p>

//             {/* Form */}
//             <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
//               <div
//                 className={
//                   "flex items-center gap-2 rounded-xl border px-3.5 h-12 transition-colors focus-within:border-[#4B3FE4] focus-within:ring-2 focus-within:ring-[#4B3FE4]/20 " +
//                   (isDark ? "border-white/10 bg-[#1E1B33]" : "border-zinc-200 bg-white")
//                 }
//               >
//                 <Mail className={"h-4 w-4 shrink-0 " + (isDark ? "text-zinc-500" : "text-zinc-400")} />
//                 <input
//                   type="email"
//                   placeholder="Email Address"
//                   required
//                   className={
//                     "w-full bg-transparent text-sm outline-none " +
//                     (isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-800 placeholder:text-zinc-400")
//                   }
//                 />
//               </div>

//               <div
//                 className={
//                   "flex items-center gap-2 rounded-xl border px-3.5 h-12 transition-colors focus-within:border-[#4B3FE4] focus-within:ring-2 focus-within:ring-[#4B3FE4]/20 " +
//                   (isDark ? "border-white/10 bg-[#1E1B33]" : "border-zinc-200 bg-white")
//                 }
//               >
//                 <Lock className={"h-4 w-4 shrink-0 " + (isDark ? "text-zinc-500" : "text-zinc-400")} />
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Password"
//                   required
//                   className={
//                     "w-full bg-transparent text-sm outline-none " +
//                     (isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-800 placeholder:text-zinc-400")
//                   }
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword((s) => !s)}
//                   className={isDark ? "text-zinc-500" : "text-zinc-400"}
//                   aria-label={showPassword ? "Hide password" : "Show password"}
//                 >
//                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                 </button>
//               </div>

//               {/* <div className="flex justify-end">
//                 <a href="#" className="text-xs font-medium text-[#4B3FE4] hover:underline">
//                   Forgot Password?
//                 </a>
//               </div> */}

//               <button
//                 type="submit"
//                 className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B1533] text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#4B3FE4]"
//               >
//                 Login as {activeRole.label.replace(" Login", "")}
//               </button>
//             </form>

//             <p className={"mt-6 text-center text-[11px] " + (isDark ? "text-zinc-500" : "text-zinc-400")}>
//               Need help signing in? Contact your workspace administrator.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }













"use client";

import { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  Mail,
  Lock,
  Sun,
  Moon,
//   Bell,
//   Settings,
  User,
  ShieldCheck,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";

const ROLES = [
  {
    id: "staff",
    label: "Staff Login",
    icon: User,
    tagline: "Access your daily tasks and schedule.",
  },
  {
    id: "admin",
    label: "Admin Login",
    icon: ShieldCheck,
    tagline: "Manage teams, projects, and permissions.",
  },
  {
    id: "superadmin",
    label: "Super Admin Login",
    icon: Crown,
    tagline: "Full control over the Planit workspace.",
  },
];

export default function PlanitLogin() {
  const [role, setRole] = useState("staff");
  const [theme, setTheme] = useState("light");
  const [showPassword, setShowPassword] = useState(false);

  const isDark = theme === "dark";
  const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];

  return (
    <div
      className={
        "min-h-screen w-full flex items-center justify-center p-6 " +
        (isDark ? "bg-[#0B0B18]" : "bg-[#EEEEF6]")
      }
    >
      <div
        className={
          "relative w-full max-w-5xl overflow-hidden rounded-[28px] shadow-2xl " +
          (isDark ? "bg-[#12101F]" : "bg-[#F4F4FA]")
        }
        style={{ minHeight: "680px" }}
      >
        {/* ---------- Decorative purple panel ---------- */}
        <div className="absolute inset-y-0 left-0 w-full md:w-[56%] overflow-hidden">
          <svg
            viewBox="0 0 620 680"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id="purpleFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6C63FF" />
                <stop offset="100%" stopColor="#4B3FE4" />
              </linearGradient>
            </defs>
            <path
              d="M0,0 H620 V420 C 520,560 380,470 300,560 C 220,650 140,610 0,680 Z"
              fill="url(#purpleFill)"
            />
          </svg>

          {/* world map dots */}
          <svg
            viewBox="0 0 620 680"
            className="absolute inset-0 h-full w-full opacity-30"
          >
            <g fill="#C7C2FF">
              {Array.from({ length: 140 }).map((_, i) => {
                const x = (i * 37) % 520;
                const y = ((i * 53) % 420) + 30;
                const r = (i % 5 === 0) ? 2.4 : 1.3;
                return <circle key={i} cx={40 + x * 0.9} cy={y} r={r} />;
              })}
            </g>
          </svg>

          {/* network lines + nodes, bottom-left (kept subtle behind the Lottie) */}
          <svg viewBox="0 0 400 300" className="absolute bottom-4 left-2 w-40 opacity-40">
            <g stroke="#B7B0FF" strokeWidth="1">
              <line x1="20" y1="240" x2="120" y2="160" />
              <line x1="120" y1="160" x2="210" y2="200" />
              <line x1="120" y1="160" x2="90" y2="60" />
              <line x1="210" y1="200" x2="300" y2="120" />
              <line x1="90" y1="60" x2="180" y2="20" />
            </g>
            <g fill="#E4E1FF">
              <circle cx="20" cy="240" r="4" />
              <circle cx="120" cy="160" r="5" />
              <circle cx="210" cy="200" r="4" />
              <circle cx="90" cy="60" r="4" />
              <circle cx="300" cy="120" r="4" />
              <circle cx="180" cy="20" r="3" />
            </g>
          </svg>

          {/* Lottie animation — focal illustration on the purple panel */}
          <div className="absolute inset-x-0 top-[42%] -translate-y-1/2 flex justify-center px-6 pointer-events-none">
            <div className="w-[78%] max-w-[340px] drop-shadow-2xl">
              <DotLottieReact
                src="https://assets1.lottiefiles.com/packages/lf20_myejiggj.json"
                loop
                autoplay
              />
            </div>
          </div>

          {/* clock icon */}
          {/* <div className="absolute top-16 left-[42%] hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
          </div> */}

          {/* chevrons */}
          <svg viewBox="0 0 24 24" className="absolute bottom-24 left-[26%] h-6 w-6 text-white/60" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="absolute top-24 left-6 h-2 w-2 rounded-full bg-white/40" />
          <div className="absolute bottom-40 left-16 h-2 w-2 rounded-full bg-emerald-300/70" />
        </div>

        {/* right side subtle squiggle */}
        <svg viewBox="0 0 500 700" className="absolute right-0 top-0 h-full w-[48%] opacity-[0.08] pointer-events-none hidden md:block">
          <path
            d="M0,650 C120,600 160,520 260,540 C360,560 380,460 460,420"
            fill="none"
            stroke={isDark ? "#8B7CFF" : "#4B3FE4"}
            strokeWidth="2"
          />
        </svg>

        {/* ---------- Top-right controls ---------- */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          <div
            className={
              "flex items-center rounded-full p-1 text-xs font-medium shadow-sm " +
              (isDark ? "bg-[#1E1B33]" : "bg-white")
            }
          >
            <button
              onClick={() => setTheme("light")}
              className={
                "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
                (!isDark ? "bg-[#4B3FE4] text-white" : "text-zinc-400")
              }
            >
              <Sun className="h-3.5 w-3.5" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={
                "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
                (isDark ? "bg-[#4B3FE4] text-white" : "text-zinc-400")
              }
            >
              <Moon className="h-3.5 w-3.5" /> Dark
            </button>
          </div>

          {/* <button
            className={
              "relative flex h-9 w-9 items-center justify-center rounded-full shadow-sm " +
              (isDark ? "bg-[#1E1B33] text-zinc-300" : "bg-white text-zinc-500")
            }
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </button>
          <button
            className={
              "flex h-9 w-9 items-center justify-center rounded-full shadow-sm " +
              (isDark ? "bg-[#1E1B33] text-zinc-300" : "bg-white text-zinc-500")
            }
          >
            <Settings className="h-4 w-4" />
          </button> */}
        </div>

        {/* ---------- Login card ---------- */}
        <div className="relative z-10 flex min-h-[680px] items-center justify-center px-4 py-16 md:justify-end md:pr-[8%] md:pl-0">
          <div
            className={
              "w-full max-w-md rounded-2xl px-8 py-9 shadow-xl sm:px-10 " +
              (isDark ? "bg-[#171529] border border-white/5" : "bg-white")
            }
          >
            {/* Logo */}
            <div className="mb-6 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#4B3FE4] text-white font-bold text-sm">
                  P
                </div>
                <span className={"text-xl font-extrabold tracking-tight " + (isDark ? "text-white" : "text-[#1B1533]")}>
                  PLAN<span className="text-[#6C63FF]">IT</span>
                </span>
              </div>
            </div>

            <h1 className={"text-center text-2xl font-bold " + (isDark ? "text-white" : "text-[#1B1533]")}>
              Welcome Back
            </h1>
            <p className={"mt-1 text-center text-sm " + (isDark ? "text-zinc-400" : "text-zinc-500")}>
              Revolutionize the way you work.
            </p>

            {/* Role selector */}
            <div
              className={
                "mt-6 grid grid-cols-3 gap-1.5 rounded-xl p-1 " +
                (isDark ? "bg-[#1E1B33]" : "bg-[#F1F0FB]")
              }
            >
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={
                      "flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-semibold leading-tight transition-all " +
                      (active
                        ? "bg-[#4B3FE4] text-white shadow-md shadow-[#4B3FE4]/30"
                        : isDark
                        ? "text-zinc-400 hover:text-zinc-200"
                        : "text-zinc-500 hover:text-[#4B3FE4]")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {r.label.replace(" Login", "")}
                  </button>
                );
              })}
            </div>
            <p className={"mt-2 text-center text-xs " + (isDark ? "text-zinc-500" : "text-zinc-400")}>
              {activeRole.tagline}
            </p>

            {/* Form */}
            <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <div
                className={
                  "flex items-center gap-2 rounded-xl border px-3.5 h-12 transition-colors focus-within:border-[#4B3FE4] focus-within:ring-2 focus-within:ring-[#4B3FE4]/20 " +
                  (isDark ? "border-white/10 bg-[#1E1B33]" : "border-zinc-200 bg-white")
                }
              >
                <Mail className={"h-4 w-4 shrink-0 " + (isDark ? "text-zinc-500" : "text-zinc-400")} />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  className={
                    "w-full bg-transparent text-sm outline-none " +
                    (isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-800 placeholder:text-zinc-400")
                  }
                />
              </div>

              <div
                className={
                  "flex items-center gap-2 rounded-xl border px-3.5 h-12 transition-colors focus-within:border-[#4B3FE4] focus-within:ring-2 focus-within:ring-[#4B3FE4]/20 " +
                  (isDark ? "border-white/10 bg-[#1E1B33]" : "border-zinc-200 bg-white")
                }
              >
                <Lock className={"h-4 w-4 shrink-0 " + (isDark ? "text-zinc-500" : "text-zinc-400")} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  required
                  className={
                    "w-full bg-transparent text-sm outline-none " +
                    (isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-800 placeholder:text-zinc-400")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className={isDark ? "text-zinc-500" : "text-zinc-400"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* <div className="flex justify-end">
                <a href="#" className="text-xs font-medium text-[#4B3FE4] hover:underline">
                  Forgot Password?
                </a>
              </div> */}

              <button
                type="submit"
                className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B1533] text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#4B3FE4]"
              >
                Login as {activeRole.label.replace(" Login", "")}
              </button>
            </form>

            {/* <p className={"mt-6 text-center text-[11px] " + (isDark ? "text-zinc-500" : "text-zinc-400")}>
              Need help signing in? Contact your workspace administrator.
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
}