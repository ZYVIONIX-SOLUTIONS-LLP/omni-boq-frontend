// // // "use client";

// // // import { useState } from "react";
// // // import { useRouter } from "next/navigation";

// // // import {
// // //   Mail,
// // //   Lock,
// // //   Sun,
// // //   Moon,
// // //   User,
// // //   ShieldCheck,
// // //   Crown,
// // //   Eye,
// // //   EyeOff,
// // // } from "lucide-react";

// // // const ROLES = [
// // //   {
// // //     id: "staff",
// // //     label: "Staff Login",
// // //     icon: User,
// // //     tagline: "Access your daily tasks and schedule.",
// // //   },
// // //   {
// // //     id: "admin",
// // //     label: "Admin Login",
// // //     icon: ShieldCheck,
// // //     tagline: "Manage teams, projects, and permissions.",
// // //   },
// // //   {
// // //     id: "superadmin",
// // //     label: "Super Admin Login",
// // //     icon: Crown,
// // //     tagline: "Full control over the Planit workspace.",
// // //   },
// // // ];

// // // export default function PlanitLogin() {
// // //   const router = useRouter();
// // //   const [role, setRole] = useState("staff");
// // //   const [theme, setTheme] = useState("light");
// // //   const [showPassword, setShowPassword] = useState(false);

// // //   const isDark = theme === "dark";
// // //   const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];

// // //   return (
// // //     <div
// // //       className={
// // //         "h-screen w-full flex items-center justify-center p-4 md:p-6 overflow-hidden " +
// // //         (isDark ? "bg-[#0B0B18]" : "bg-[#EEEEF6]")
// // //       }
// // //     >
// // //       <div
// // //         className={
// // //           "relative w-full max-w-5xl overflow-hidden rounded-[28px] shadow-2xl " +
// // //           (isDark ? "bg-[#12101F]" : "bg-[#F4F4FA]")
// // //         }
// // //         style={{ height: "680px", maxHeight: "100%" }}
// // //       >
// // //         {/* ---------- Decorative purple panel ---------- */}
// // //         <div className="absolute inset-y-0 left-0 w-full md:w-[56%] overflow-hidden">
// // //           <svg
// // //             viewBox="0 0 620 680"
// // //             preserveAspectRatio="none"
// // //             className="absolute inset-0 h-full w-full"
// // //           >
// // //             <defs>
// // //               <linearGradient id="purpleFill" x1="0" y1="0" x2="1" y2="1">
// // //                 <stop offset="0%" stopColor="#6C63FF" />
// // //                 <stop offset="100%" stopColor="#4B3FE4" />
// // //               </linearGradient>
// // //             </defs>
// // //             <path
// // //               d="M0,0 H620 V420 C 520,560 380,470 300,560 C 220,650 140,610 0,680 Z"
// // //               fill="url(#purpleFill)"
// // //             />
// // //           </svg>

// // //           {/* world map dots */}
// // //           <svg
// // //             viewBox="0 0 620 680"
// // //             className="absolute inset-0 h-full w-full opacity-30"
// // //           >
// // //             <g fill="#C7C2FF">
// // //               {Array.from({ length: 140 }).map((_, i) => {
// // //                 const x = (i * 37) % 520;
// // //                 const y = ((i * 53) % 420) + 30;
// // //                 const r = (i % 5 === 0) ? 2.4 : 1.3;
// // //                 return <circle key={i} cx={40 + x * 0.9} cy={y} r={r} />;
// // //               })}
// // //             </g>
// // //           </svg>

// // //           {/* network lines + nodes, bottom-left (kept subtle behind the Lottie) */}
// // //           <svg viewBox="0 0 400 300" className="absolute bottom-4 left-2 w-40 opacity-40">
// // //             <g stroke="#B7B0FF" strokeWidth="1">
// // //               <line x1="20" y1="240" x2="120" y2="160" />
// // //               <line x1="120" y1="160" x2="210" y2="200" />
// // //               <line x1="120" y1="160" x2="90" y2="60" />
// // //               <line x1="210" y1="200" x2="300" y2="120" />
// // //               <line x1="90" y1="60" x2="180" y2="20" />
// // //             </g>
// // //             <g fill="#E4E1FF">
// // //               <circle cx="20" cy="240" r="4" />
// // //               <circle cx="120" cy="160" r="5" />
// // //               <circle cx="210" cy="200" r="4" />
// // //               <circle cx="90" cy="60" r="4" />
// // //               <circle cx="300" cy="120" r="4" />
// // //               <circle cx="180" cy="20" r="3" />
// // //             </g>
// // //           </svg>

// // //           {/* Inline SVG illustration — no network dependency */}
// // //           <div className="absolute inset-x-0 top-[42%] -translate-y-1/2 flex justify-center px-6 pointer-events-none">
// // //             <div className="w-[78%] max-w-[340px] drop-shadow-2xl">
// // //               <svg viewBox="0 0 340 280" fill="none" xmlns="http://www.w3.org/2000/svg">
// // //                 {/* Monitor */}
// // //                 <rect x="60" y="40" width="220" height="148" rx="12" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
// // //                 <rect x="72" y="52" width="196" height="124" rx="6" fill="white" fillOpacity="0.08" />
// // //                 {/* Screen content bars */}
// // //                 <rect x="84" y="66" width="80" height="8" rx="4" fill="white" fillOpacity="0.6" />
// // //                 <rect x="84" y="82" width="120" height="6" rx="3" fill="white" fillOpacity="0.3" />
// // //                 <rect x="84" y="96" width="100" height="6" rx="3" fill="white" fillOpacity="0.3" />
// // //                 {/* Chart bars */}
// // //                 <rect x="84" y="130" width="16" height="34" rx="4" fill="#C7C2FF" fillOpacity="0.8" />
// // //                 <rect x="106" y="118" width="16" height="46" rx="4" fill="#A89CFF" fillOpacity="0.9" />
// // //                 <rect x="128" y="124" width="16" height="40" rx="4" fill="#C7C2FF" fillOpacity="0.8" />
// // //                 <rect x="150" y="108" width="16" height="56" rx="4" fill="white" fillOpacity="0.9" />
// // //                 <rect x="172" y="120" width="16" height="44" rx="4" fill="#C7C2FF" fillOpacity="0.8" />
// // //                 <rect x="194" y="132" width="16" height="32" rx="4" fill="#A89CFF" fillOpacity="0.9" />
// // //                 {/* Monitor stand */}
// // //                 <rect x="155" y="188" width="30" height="16" rx="2" fill="white" fillOpacity="0.2" />
// // //                 <rect x="138" y="202" width="64" height="6" rx="3" fill="white" fillOpacity="0.25" />
// // //                 {/* Floating card top-right */}
// // //                 <rect x="232" y="28" width="88" height="52" rx="8" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
// // //                 <circle cx="250" cy="46" r="8" fill="#A89CFF" fillOpacity="0.7" />
// // //                 <rect x="264" y="40" width="44" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
// // //                 <rect x="264" y="50" width="32" height="4" rx="2" fill="white" fillOpacity="0.3" />
// // //                 <rect x="242" y="62" width="66" height="4" rx="2" fill="white" fillOpacity="0.25" />
// // //                 {/* Floating card bottom-left */}
// // //                 <rect x="20" y="170" width="76" height="44" rx="8" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
// // //                 <rect x="30" y="182" width="56" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
// // //                 <rect x="30" y="193" width="40" height="4" rx="2" fill="white" fillOpacity="0.3" />
// // //                 <rect x="30" y="202" width="48" height="4" rx="2" fill="white" fillOpacity="0.25" />
// // //                 {/* Small dots */}
// // //                 <circle cx="290" cy="160" r="4" fill="white" fillOpacity="0.4" />
// // //                 <circle cx="30" cy="90" r="3" fill="white" fillOpacity="0.35" />
// // //                 <circle cx="310" cy="210" r="3" fill="#C7C2FF" fillOpacity="0.6" />
// // //                 <circle cx="50" cy="240" r="5" fill="white" fillOpacity="0.2" />
// // //               </svg>
// // //             </div>
// // //           </div>

// // //           {/* clock icon */}
// // //           {/* <div className="absolute top-16 left-[42%] hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
// // //             <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
// // //               <circle cx="12" cy="12" r="9" />
// // //               <path d="M12 7v5l3 2" strokeLinecap="round" />
// // //             </svg>
// // //           </div> */}

// // //           {/* chevrons */}
// // //           <svg viewBox="0 0 24 24" className="absolute bottom-24 left-[26%] h-6 w-6 text-white/60" fill="none" stroke="currentColor" strokeWidth="2">
// // //             <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
// // //           </svg>

// // //           <div className="absolute top-24 left-6 h-2 w-2 rounded-full bg-white/40" />
// // //           <div className="absolute bottom-40 left-16 h-2 w-2 rounded-full bg-emerald-300/70" />
// // //         </div>

// // //         {/* right side subtle squiggle */}
// // //         <svg viewBox="0 0 500 700" className="absolute right-0 top-0 h-full w-[48%] opacity-[0.08] pointer-events-none hidden md:block">
// // //           <path
// // //             d="M0,650 C120,600 160,520 260,540 C360,560 380,460 460,420"
// // //             fill="none"
// // //             stroke={isDark ? "#8B7CFF" : "#4B3FE4"}
// // //             strokeWidth="2"
// // //           />
// // //         </svg>

// // //         {/* ---------- Top-right controls ---------- */}
// // //         <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
// // //           <div
// // //             className={
// // //               "flex items-center rounded-full p-1 text-xs font-medium shadow-sm " +
// // //               (isDark ? "bg-[#1E1B33]" : "bg-white")
// // //             }
// // //           >
// // //             <button
// // //               onClick={() => setTheme("light")}
// // //               className={
// // //                 "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
// // //                 (!isDark ? "bg-[#4B3FE4] text-white" : "text-zinc-400")
// // //               }
// // //             >
// // //               <Sun className="h-3.5 w-3.5" /> Light
// // //             </button>
// // //             <button
// // //               onClick={() => setTheme("dark")}
// // //               className={
// // //                 "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
// // //                 (isDark ? "bg-[#4B3FE4] text-white" : "text-zinc-400")
// // //               }
// // //             >
// // //               <Moon className="h-3.5 w-3.5" /> Dark
// // //             </button>
// // //           </div>

// // //           {/* <button
// // //             className={
// // //               "relative flex h-9 w-9 items-center justify-center rounded-full shadow-sm " +
// // //               (isDark ? "bg-[#1E1B33] text-zinc-300" : "bg-white text-zinc-500")
// // //             }
// // //           >
// // //             <Bell className="h-4 w-4" />
// // //             <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
// // //           </button>
// // //           <button
// // //             className={
// // //               "flex h-9 w-9 items-center justify-center rounded-full shadow-sm " +
// // //               (isDark ? "bg-[#1E1B33] text-zinc-300" : "bg-white text-zinc-500")
// // //             }
// // //           >
// // //             <Settings className="h-4 w-4" />
// // //           </button> */}
// // //         </div>

// // //         {/* ---------- Login card ---------- */}
// // //         <div className="relative z-10 flex h-full items-center justify-center px-4 py-6 md:justify-end md:pr-[8%] md:pl-0">
// // //           <div
// // //             className={
// // //               "w-full max-w-md rounded-2xl px-8 py-9 shadow-xl sm:px-10 " +
// // //               (isDark ? "bg-[#171529] border border-white/5" : "bg-white")
// // //             }
// // //           >
// // //             {/* Logo */}
// // //             <div className="mb-6 flex flex-col items-center gap-1">
// // //               <div className="flex items-center gap-2">
// // //                 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#4B3FE4] text-white font-bold text-sm">
// // //                   P
// // //                 </div>
// // //                 <span className={"text-xl font-extrabold tracking-tight " + (isDark ? "text-white" : "text-[#1B1533]")}>
// // //                   Zyvionix<span className="text-[#6C63FF]">Solutions</span>
// // //                 </span>
// // //               </div>
// // //             </div>

// // //             <h1 className={"text-center text-2xl font-bold " + (isDark ? "text-white" : "text-[#1B1533]")}>
// // //               Welcome Back
// // //             </h1>
// // //             <p className={"mt-1 text-center text-sm " + (isDark ? "text-zinc-400" : "text-zinc-500")}>
// // //               Revolutionize the way you work.
// // //             </p>

// // //             {/* Role selector */}
// // //             <div
// // //               className={
// // //                 "mt-6 grid grid-cols-3 gap-1.5 rounded-xl p-1 " +
// // //                 (isDark ? "bg-[#1E1B33]" : "bg-[#F1F0FB]")
// // //               }
// // //             >
// // //               {ROLES.map((r) => {
// // //                 const Icon = r.icon;
// // //                 const active = role === r.id;
// // //                 return (
// // //                   <button
// // //                     key={r.id}
// // //                     type="button"
// // //                     onClick={() => setRole(r.id)}
// // //                     className={
// // //                       "flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-semibold leading-tight transition-all " +
// // //                       (active
// // //                         ? "bg-[#4B3FE4] text-white shadow-md shadow-[#4B3FE4]/30"
// // //                         : isDark
// // //                           ? "text-zinc-400 hover:text-zinc-200"
// // //                           : "text-zinc-500 hover:text-[#4B3FE4]")
// // //                     }
// // //                   >
// // //                     <Icon className="h-4 w-4" />
// // //                     {r.label.replace(" Login", "")}
// // //                   </button>
// // //                 );
// // //               })}
// // //             </div>
// // //             <p className={"mt-2 text-center text-xs " + (isDark ? "text-zinc-500" : "text-zinc-400")}>
// // //               {activeRole.tagline}
// // //             </p>

// // //             {/* Form */}
// // //             <form
// // //               className="mt-6 flex flex-col gap-4"
// // //               onSubmit={(e) => {
// // //                 e.preventDefault();
// // //                 router.push("/Dashboard");
// // //               }}
// // //             >
// // //               <div
// // //                 className={
// // //                   "flex items-center gap-2 rounded-xl border px-3.5 h-12 transition-colors focus-within:border-[#4B3FE4] focus-within:ring-2 focus-within:ring-[#4B3FE4]/20 " +
// // //                   (isDark ? "border-white/10 bg-[#1E1B33]" : "border-zinc-200 bg-white")
// // //                 }
// // //               >
// // //                 <Mail className={"h-4 w-4 shrink-0 " + (isDark ? "text-zinc-500" : "text-zinc-400")} />
// // //                 <input
// // //                   type="email"
// // //                   placeholder="Email Address"
// // //                   required
// // //                   className={
// // //                     "w-full bg-transparent text-sm outline-none " +
// // //                     (isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-800 placeholder:text-zinc-400")
// // //                   }
// // //                 />
// // //               </div>

// // //               <div
// // //                 className={
// // //                   "flex items-center gap-2 rounded-xl border px-3.5 h-12 transition-colors focus-within:border-[#4B3FE4] focus-within:ring-2 focus-within:ring-[#4B3FE4]/20 " +
// // //                   (isDark ? "border-white/10 bg-[#1E1B33]" : "border-zinc-200 bg-white")
// // //                 }
// // //               >
// // //                 <Lock className={"h-4 w-4 shrink-0 " + (isDark ? "text-zinc-500" : "text-zinc-400")} />
// // //                 <input
// // //                   type={showPassword ? "text" : "password"}
// // //                   placeholder="Password"
// // //                   required
// // //                   className={
// // //                     "w-full bg-transparent text-sm outline-none " +
// // //                     (isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-800 placeholder:text-zinc-400")
// // //                   }
// // //                 />
// // //                 <button
// // //                   type="button"
// // //                   onClick={() => setShowPassword((s) => !s)}
// // //                   className={isDark ? "text-zinc-500" : "text-zinc-400"}
// // //                   aria-label={showPassword ? "Hide password" : "Show password"}
// // //                 >
// // //                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
// // //                 </button>
// // //               </div>

// // //               {/* <div className="flex justify-end">
// // //                 <a href="#" className="text-xs font-medium text-[#4B3FE4] hover:underline">
// // //                   Forgot Password?
// // //                 </a>
// // //               </div> */}

// // //               <button
// // //                 type="submit"
// // //                 className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B1533] text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#4B3FE4]"
// // //               >
// // //                 Login as {activeRole.label.replace(" Login", "")}
// // //               </button>
// // //             </form>

// // //             {/* <p className={"mt-6 text-center text-[11px] " + (isDark ? "text-zinc-500" : "text-zinc-400")}>
// // //               Need help signing in? Contact your workspace administrator.
// // //             </p> */}
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }









// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";

// import {
//   Mail,
//   Lock,
//   Sun,
//   Moon,
//   User,
//   ShieldCheck,
//   Crown,
//   Eye,
//   EyeOff,
//   ChevronRight,
// } from "lucide-react";

// const ROLES = [
//   {
//     id: "staff",
//     label: "Staff",
//     icon: User,
//     tagline: "Access your daily tasks and schedule.",
//   },
//   {
//     id: "admin",
//     label: "Admin",
//     icon: ShieldCheck,
//     tagline: "Manage teams, projects, and permissions.",
//   },
//   {
//     id: "superadmin",
//     label: "Super Admin",
//     icon: Crown,
//     tagline: "Full control over the Planit workspace.",
//   },
// ];

// export default function PlanitLogin() {
//   const router = useRouter();
//   const [role, setRole] = useState("staff");
//   const [theme, setTheme] = useState("light");
//   const [showPassword, setShowPassword] = useState(false);
//   const [remember, setRemember] = useState(false);

//   const isDark = theme === "dark";
//   const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];
//   const ActiveIcon = activeRole.icon;

//   const handleSubmit = (e: { preventDefault: () => void; }) => {
//     e.preventDefault();
//     router.push("/Dashboard");
//   };

//   return (
//     <div
//       className={
//         "min-h-screen w-full flex items-center justify-center p-4 md:p-8 transition-colors duration-300 " +
//         (isDark ? "bg-[#070B18]" : "bg-[#EEF1F8]")
//       }
//     >
//       <div
//         className={
//           "relative w-full max-w-5xl overflow-hidden rounded-[28px] shadow-2xl " +
//           (isDark ? "bg-[#0E1424]" : "bg-white")
//         }
//         style={{ minHeight: "620px" }}
//       >
//         {/* ---------- Diagonal blue panel ---------- */}
//         <div
//           className={
//             "absolute inset-0 transition-colors duration-300 " +
//             (isDark ? "bg-gradient-to-br from-[#0C2E7A] to-[#071A47]" : "bg-gradient-to-br from-[#0B3FA0] to-[#0A2C77]")
//           }
//           style={{ clipPath: "polygon(54% 0, 100% 0, 100% 100%, 24% 100%)" }}
//         >
//           {/* dotted world-map texture */}
//           <svg viewBox="0 0 800 660" className="absolute inset-0 h-full w-full opacity-[0.14]">
//             <g fill="#BFD3FF">
//               {Array.from({ length: 220 }).map((_, i) => {
//                 const x = (i * 41) % 780;
//                 const y = (i * 67) % 660;
//                 const r = i % 6 === 0 ? 2.2 : 1.1;
//                 return <circle key={i} cx={x} cy={y} r={r} />;
//               })}
//             </g>
//           </svg>

//           {/* faint concentric radar rings, lower-right */}
//           <svg viewBox="0 0 400 400" className="absolute -bottom-16 -right-16 h-72 w-72 opacity-[0.18]">
//             <circle cx="200" cy="200" r="70" fill="none" stroke="#9DB9FF" strokeWidth="1.5" />
//             <circle cx="200" cy="200" r="130" fill="none" stroke="#9DB9FF" strokeWidth="1.5" />
//             <circle cx="200" cy="200" r="190" fill="none" stroke="#9DB9FF" strokeWidth="1.5" />
//           </svg>

//           {/* thin accent line following the diagonal, offset */}
//           <svg viewBox="0 0 800 660" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
//             <line x1="0" y1="660" x2="800" y2="-40" stroke="#FFFFFF" strokeWidth="2" opacity="0.35"
//               transform="translate(-46,0) scale(0.86,1)" />
//           </svg>
//         </div>

//         {/* ---------- Theme toggle ---------- */}
//         <div className="absolute top-6 right-6 z-20">
//           <div
//             className={
//               "flex items-center rounded-full p-1 text-xs font-medium shadow-sm " +
//               (isDark ? "bg-white/10 backdrop-blur-sm" : "bg-white")
//             }
//           >
//             <button
//               type="button"
//               onClick={() => setTheme("light")}
//               className={
//                 "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
//                 (!isDark ? "bg-[#FFFFFF] text-[#0B3FA0]" : "text-white/60")
//               }
//             >
//               <Sun className="h-3.5 w-3.5" /> Light
//             </button>
//             <button
//               type="button"
//               onClick={() => setTheme("dark")}
//               className={
//                 "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
//                 (isDark ? "bg-[#FFFFFF] text-[#0B3FA0]" : "text-zinc-400")
//               }
//             >
//               <Moon className="h-3.5 w-3.5" /> Dark
//             </button>
//           </div>
//         </div>

//         {/* ---------- Content row: brand panel + form panel side by side ---------- */}
//         <div className="relative z-10 flex w-full flex-col md:flex-row">
//           {/* Left: brand / logo panel (white side) */}
//           <div className="relative hidden md:flex w-[46%] shrink-0 flex-col items-center justify-center px-10 py-10 text-center">
//             <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
//               <span className="absolute inset-0 rounded-full border border-[#0B3FA0]/15" />
//               <span className="absolute inset-2 rounded-full border border-[#0B3FA0]/25" />
//               <span className="absolute inset-4 rounded-full bg-gradient-to-br from-[#0B3FA0] to-[#0A2C77] opacity-90 animate-pulse" />
//               <ShieldCheck className="relative h-9 w-9 text-white" strokeWidth={1.75} />
//             </div>

//             <h2 className={"text-2xl font-bold tracking-tight " + (isDark ? "text-white" : "text-[#0B1B3D]")}>
//               Zyvionix<span className="text-[#0B3FA0]">Solutions</span>
//             </h2>
//             <p className={"mt-2 max-w-xs text-sm leading-relaxed " + (isDark ? "text-zinc-400" : "text-zinc-500")}>
//               One workspace to plan, track, and run every team &mdash; built for the way you actually work.
//             </p>

//             <div className="mt-8 flex items-center gap-2 text-xs font-medium">
//               <span className={"flex items-center gap-1.5 rounded-full px-3 py-1.5 " + (isDark ? "bg-white/5 text-zinc-300" : "bg-[#F1F4FC] text-[#0B3FA0]")}>
//                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
//                 All systems operational
//               </span>
//             </div>
//           </div>

//           {/* Right: login form (on blue diagonal) */}
//           <div className="relative flex flex-1 items-center justify-center px-6 py-10 md:px-10">
//             <div className="w-full max-w-sm">
//               {/* mobile-only compact logo */}
//               <div className="mb-6 flex items-center justify-center gap-2 md:hidden">
//                 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white font-bold text-sm">
//                   Z
//                 </div>
//                 <span className="text-lg font-extrabold tracking-tight text-white">
//                   Zyvionix<span className="text-blue-200">Solutions</span>
//                 </span>
//               </div>

//               <h1 className="text-2xl font-bold text-white">Welcome back</h1>
//               <p className="mt-1 text-sm text-white/60">Sign in to continue to your workspace.</p>

//               {/* Role selector */}
//               <div className="mt-6 grid grid-cols-3 gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
//                 {ROLES.map((r) => {
//                   const Icon = r.icon;
//                   const active = role === r.id;
//                   return (
//                     <button
//                       key={r.id}
//                       type="button"
//                       onClick={() => setRole(r.id)}
//                       className={
//                         "flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-semibold leading-tight transition-all " +
//                         (active
//                           ? "bg-[#FFFFFF] text-[#0B3FA0] shadow-md"
//                           : "text-white/60 hover:text-white/90")
//                       }
//                     >
//                       <Icon className="h-4 w-4" />
//                       {r.label}
//                     </button>
//                   );
//                 })}
//               </div>
//               <p className="mt-2 flex items-center gap-1 text-xs text-white/50">
//                 <ActiveIcon className="h-3 w-3" />
//                 {activeRole.tagline}
//               </p>

//               {/* Form */}
//               <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
//                 <div>
//                   <label className="mb-1.5 block text-xs font-medium text-white/70">
//                     Your email
//                   </label>
//                   <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 h-12 backdrop-blur-sm transition-colors focus-within:border-[#FFFFFF] focus-within:ring-2 focus-within:ring-[#FFFFFF]/25">
//                     <Mail className="h-4 w-4 shrink-0 text-white/50" />
//                     <input
//                       type="email"
//                       placeholder="Enter your email"
//                       required
//                       className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <label className="mb-1.5 block text-xs font-medium text-white/70">
//                     Password
//                   </label>
//                   <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 h-12 backdrop-blur-sm transition-colors focus-within:border-[#FFFFFF] focus-within:ring-2 focus-within:ring-[#FFFFFF]/25">
//                     <Lock className="h-4 w-4 shrink-0 text-white/50" />
//                     <input
//                       type={showPassword ? "text" : "password"}
//                       placeholder="Enter your password"
//                       required
//                       className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setShowPassword((s) => !s)}
//                       className="text-white/50 hover:text-white/80"
//                       aria-label={showPassword ? "Hide password" : "Show password"}
//                     >
//                       {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                     </button>
//                   </div>
//                 </div>

//                 <div className="flex items-center justify-between text-xs">
//                   <label className="flex items-center gap-2 text-white/70 cursor-pointer select-none">
//                     <input
//                       type="checkbox"
//                       checked={remember}
//                       onChange={(e) => setRemember(e.target.checked)}
//                       className="h-3.5 w-3.5 rounded border-white/30 bg-white/10 accent-blue-200"
//                     />
//                     Remember me
//                   </label>
//                   <a href="#" className="font-medium text-[#FFFFFF] hover:underline">
//                     Recover password
//                   </a>
//                 </div>

//                 <button
//                   type="submit"
//                   className="mt-1 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold uppercase tracking-wide text-[#0B3FA0] transition-colors hover:bg-blue-50 group"
//                 >
//                   Sign in as {activeRole.label}
//                   <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
//                 </button>
//               </form>

//               <p className="mt-6 text-center text-[11px] text-white/40">
//                 Need help signing in? Contact your workspace administrator.
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }






////////////// Globally added color code//////////////


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Mail,
  Lock,
  Sun,
  Moon,
  User,
  ShieldCheck,
  Crown,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";

const ROLES = [
  {
    id: "staff",
    label: "Staff",
    icon: User,
    tagline: "Access your daily tasks and schedule.",
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    tagline: "Manage teams, projects, and permissions.",
  },
  {
    id: "superadmin",
    label: "Super Admin",
    icon: Crown,
    tagline: "Full control over the Planit workspace.",
  },
];

export default function PlanitLogin() {
  const router = useRouter();
  const [role, setRole] = useState("staff");
  const [theme, setTheme] = useState("light");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const isDark = theme === "dark";
  const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];
  const ActiveIcon = activeRole.icon;


 const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");



  // Toggle dark class on the html element for Tailwind global dark mode variant sync
  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  setLoading(true);
  setError("");

  try {
    const response = await fetch(
      "https://omnibackend.zyvionixsolutions.com/api/v1/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      body: JSON.stringify({
  username,
  password,
  role: role.toUpperCase(), // STAFF, ADMIN, SUPERADMIN
}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Save token
    localStorage.setItem("token", data.token);

    // Save user details
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirect
    router.push("/Dashboard");
  } catch (err: any) {
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 transition-colors duration-300 bg-background">
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-[28px] shadow-2xl bg-card border border-border"
        style={{ minHeight: "620px" }}
      >
        {/* ---------- Diagonal global brand panel ---------- */}
        <div
          className="absolute inset-0 transition-colors duration-300 bg-gradient-to-br from-primary via-primary/90 to-primary/70"
          style={{ clipPath: "polygon(54% 0, 100% 0, 100% 100%, 24% 100%)" }}
        >
          {/* dotted world-map texture */}
          <svg viewBox="0 0 800 660" className="absolute inset-0 h-full w-full opacity-[0.14]">
            <g fill="currentColor" className="text-primary-foreground">
              {Array.from({ length: 220 }).map((_, i) => {
                const x = (i * 41) % 780;
                const y = (i * 67) % 660;
                const r = i % 6 === 0 ? 2.2 : 1.1;
                return <circle key={i} cx={x} cy={y} r={r} />;
              })}
            </g>
          </svg>

          {/* faint concentric radar rings, lower-right */}
          <svg viewBox="0 0 400 400" className="absolute -bottom-16 -right-16 h-72 w-72 opacity-[0.18]">
            <circle cx="200" cy="200" r="70" fill="none" stroke="currentColor" className="text-primary-foreground" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="130" fill="none" stroke="currentColor" className="text-primary-foreground" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" className="text-primary-foreground" strokeWidth="1.5" />
          </svg>

          {/* thin accent line following the diagonal, offset */}
          <svg viewBox="0 0 800 660" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <line x1="0" y1="660" x2="800" y2="-40" stroke="currentColor" className="text-primary-foreground" strokeWidth="2" opacity="0.35"
              transform="translate(-46,0) scale(0.86,1)" />
          </svg>
        </div>

        {/* ---------- Theme toggle ---------- */}
        <div className="absolute top-6 right-6 z-20">
          <div className="flex items-center rounded-full p-1 text-xs font-medium shadow-sm bg-muted/50 backdrop-blur-sm border border-border">
            <button
              type="button"
              onClick={() => toggleTheme("light")}
              className={
                "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
                (!isDark ? "bg-card text-primary font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Sun className="h-3.5 w-3.5" /> Light
            </button>
            <button
              type="button"
              onClick={() => toggleTheme("dark")}
              className={
                "flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors " +
                (isDark ? "bg-primary text-primary-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Moon className="h-3.5 w-3.5" /> Dark
            </button>
          </div>
        </div>

        {/* ---------- Content row: brand panel + form panel side by side ---------- */}
        <div className="relative z-10 flex w-full flex-col md:flex-row">
          {/* Left: brand / logo panel */}
          <div className="relative hidden md:flex w-[46%] shrink-0 flex-col items-center justify-center px-10 py-10 text-center">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-primary/15" />
              <span className="absolute inset-2 rounded-full border border-primary/25" />
              <span className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/80 opacity-90 animate-pulse" />
              <ShieldCheck className="relative h-9 w-9 text-primary-foreground" strokeWidth={1.75} />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Zyvionix<span className="text-primary">Solutions</span>
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              One workspace to plan, track, and run every team &mdash; built for the way you actually work.
            </p>

            <div className="mt-8 flex items-center gap-2 text-xs font-medium">
              {/* <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-muted text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All systems operational
              </span> */}
            </div>
          </div>

          {/* Right: login form (on brand gradient panel side) */}
          <div className="relative flex flex-1 items-center justify-center px-6 py-10 md:px-10">
            <div className="w-full max-w-sm">
              {/* mobile-only compact logo */}
              <div className="mb-6 flex items-center justify-center gap-2 md:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground font-bold text-sm">
                  Z
                </div>
                <span className="text-lg font-extrabold tracking-tight text-primary-foreground">
                  Zyvionix<span className="text-primary-foreground/80">Solutions</span>
                </span>
              </div>

              <h1 className="text-2xl font-bold text-primary-foreground">Welcome back</h1>
              <p className="mt-1 text-sm text-primary-foreground/70">Sign in to continue to your workspace.</p>

              {/* Role selector */}
              <div className="mt-6 grid grid-cols-3 gap-1.5 rounded-xl bg-primary-foreground/10 p-1 backdrop-blur-sm">
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
                          ? "bg-primary-foreground text-primary shadow-md"
                          : "text-primary-foreground/60 hover:text-primary-foreground/90")
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-primary-foreground/60">
                <ActiveIcon className="h-3 w-3" />
                {activeRole.tagline}
              </p>

              {/* Form */}
              <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-primary-foreground/80">
                    User Name
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3.5 h-12 backdrop-blur-sm transition-colors focus-within:border-primary-foreground focus-within:ring-2 focus-within:ring-primary-foreground/25">
                    <Mail className="h-4 w-4 shrink-0 text-primary-foreground/60" />
                    <input
                      type="text"
                      placeholder="Enter your user name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-primary-foreground/80">
                    Password
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3.5 h-12 backdrop-blur-sm transition-colors focus-within:border-primary-foreground focus-within:ring-2 focus-within:ring-primary-foreground/25">
                    <Lock className="h-4 w-4 shrink-0 text-primary-foreground/60" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-primary-foreground/60 hover:text-primary-foreground/80"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-primary-foreground/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-primary-foreground/30 bg-primary-foreground/10 accent-primary-foreground"
                    />
                    Remember me
                  </label>
                  <a href="#" className="font-medium text-primary-foreground hover:underline">
                    Recover password
                  </a>
                </div> */}

{error && (
  <div className="rounded-lg border border-red-500 bg-red-500/20 p-3 text-sm text-red-100">
    {error}
  </div>
)}

           <button
  type="submit"
  disabled={loading}
  className="mt-1 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary-foreground text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:opacity-90 disabled:opacity-50"
>
  {loading ? "Signing In..." : `Sign in as ${activeRole.label}`}
  {!loading && (
    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
  )}
</button>
              </form>

              <p className="mt-6 text-center text-[11px] text-primary-foreground/50">
                Need help signing in? Contact your workspace administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}