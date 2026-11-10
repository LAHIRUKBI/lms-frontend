"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  GraduationCap,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Lock,
  UserRound,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import AnalysisLoader from "@/app/components/AnalysisLoader";

export default function LoginPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({ id: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Loading the dark mode preference from localStorage — unchanged.
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  // Original API / loading / storage / role routing logic kept intact.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Running the API call and a minimum 3-second delay in parallel
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 3000));

      const [response] = await Promise.all([
        axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, credentials),
        delayPromise,
      ]);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      const user = response.data.user;

      // Redirecting to the relevant dashboard based on the role
      if (user.role === "admin") {
        if (user.isDefault) {
          router.push("/admin/dashboard");
        } else {
          router.push("/admin/dashboard");
        }
      } else if (user.role === "teacher") {
        router.push("/teacher/dashboard");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "An error occurred during login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={`lms-login-page relative isolate flex min-h-screen min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-10 transition-colors duration-300 sm:px-7 lg:px-10 ${
        darkMode
          ? "lms-dark bg-[#111329] text-[#f3f0ff]"
          : "bg-[#fcfbff] text-[#20294f]"
      }`}
      style={{ colorScheme: darkMode ? "dark" : "light" }}
    >
      <style>{`
        @keyframes lms-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lms-appear { animation: lms-rise 650ms cubic-bezier(.2,.8,.2,1) both; }
        .lms-input:-webkit-autofill,
        .lms-input:-webkit-autofill:hover,
        .lms-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #20294f;
          -webkit-box-shadow: 0 0 0 1000px #fff inset;
          transition: background-color 99999s ease-in-out 0s;
        }
        .lms-dark .lms-input:-webkit-autofill,
        .lms-dark .lms-input:-webkit-autofill:hover,
        .lms-dark .lms-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #f3f0ff;
          -webkit-box-shadow: 0 0 0 1000px #20223e inset;
        }
        @media (prefers-reduced-motion: reduce) {
          .lms-appear { animation: none; }
        }
      `}</style>

      {/* Keep the original minimum-three-second popup loader */}
      {loading && (
        <AnalysisLoader
          title="Logging in..."
          subtitle="Verifying credentials & preparing your dashboard"
        />
      )}

      {/* Lavender ambient background (no image assets needed) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 ${
          darkMode
            ? "bg-[radial-gradient(ellipse_at_62%_32%,rgba(105,83,186,0.19),transparent_53%)]"
            : "bg-[radial-gradient(ellipse_at_65%_37%,rgba(157,135,240,0.17),transparent_53%)]"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-20 -top-32 h-[370px] w-[550px] rotate-[30deg] rounded-[90px] blur-[1px] ${
          darkMode ? "bg-violet-600/10" : "bg-violet-200/30"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-40 -top-32 h-[310px] w-[500px] rotate-[36deg] rounded-[90px] ${
          darkMode ? "bg-indigo-400/5" : "bg-indigo-200/25"
        }`}
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 -z-10 hidden h-[40%] min-h-[200px] w-full lg:block"
        viewBox="0 0 1440 360"
        preserveAspectRatio="none"
      >
        <path
          d="M0 42 C145 120 220 294 410 322 C670 376 995 352 1440 360 L0 360 Z"
          fill={darkMode ? "#6a56af" : "#e7e1ff"}
          opacity={darkMode ? "0.13" : "0.57"}
        >
          <animate
            attributeName="d"
            dur="12s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.25;0.5;0.75;1"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            values={[
              "M0 42 C145 120 220 294 410 322 C670 376 995 352 1440 360 L0 360 Z",
              "M0 70 C155 115 235 270 430 307 C695 367 1030 349 1440 360 L0 360 Z",
              "M0 34 C135 148 215 317 400 327 C650 381 1015 352 1440 360 L0 360 Z",
              "M0 55 C170 110 240 290 420 315 C675 363 990 351 1440 360 L0 360 Z",
              "M0 42 C145 120 220 294 410 322 C670 376 995 352 1440 360 L0 360 Z",
            ].join(";")}
          />
        </path>
        <path
          d="M0 155 C235 205 430 338 720 356 C950 370 1170 360 1440 360 L0 360 Z"
          fill={darkMode ? "#8e79d1" : "#c5b8f8"}
          opacity={darkMode ? "0.16" : "0.46"}
        >
          <animate
            attributeName="d"
            dur="15s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.25;0.5;0.75;1"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            values={[
              "M0 155 C235 205 430 338 720 356 C950 370 1170 360 1440 360 L0 360 Z",
              "M0 170 C210 185 445 319 735 350 C960 373 1190 359 1440 360 L0 360 Z",
              "M0 144 C255 225 450 345 705 354 C930 369 1150 359 1440 360 L0 360 Z",
              "M0 164 C230 206 420 325 730 356 C950 373 1160 359 1440 360 L0 360 Z",
              "M0 155 C235 205 430 338 720 356 C950 370 1170 360 1440 360 L0 360 Z",
            ].join(";")}
          />
        </path>
        <path
          d="M0 248 C205 210 350 335 560 354 C830 380 1190 356 1440 360 L0 360 Z"
          fill={darkMode ? "#7158bf" : "#9a87ed"}
          opacity={darkMode ? "0.14" : "0.25"}
        >
          <animate
            attributeName="d"
            dur="18s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.25;0.5;0.75;1"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            values={[
              "M0 248 C205 210 350 335 560 354 C830 380 1190 356 1440 360 L0 360 Z",
              "M0 230 C185 235 380 319 585 348 C845 379 1205 357 1440 360 L0 360 Z",
              "M0 260 C215 203 335 342 555 353 C830 378 1185 357 1440 360 L0 360 Z",
              "M0 238 C205 225 365 332 575 351 C820 375 1195 356 1440 360 L0 360 Z",
              "M0 248 C205 210 350 335 560 354 C830 380 1190 356 1440 360 L0 360 Z",
            ].join(";")}
          />
        </path>
      </svg>

      {/* Existing persistent light/dark setting, updated visually */}
      <button
        type="button"
        onClick={() => setDarkMode(!darkMode)}
        aria-label="Toggle dark mode"
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        className={`absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:right-7 sm:top-6 ${
          darkMode
            ? "border-white/10 bg-white/10 text-violet-200 hover:bg-white/15"
            : "border-violet-100 bg-white/90 text-[#5b4aaa] hover:bg-violet-50"
        }`}
      >
        {darkMode ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
      </button>

      <div className="relative z-10 mx-auto grid w-full max-w-[1150px] items-center gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 xl:gap-24">
        {/* Desktop brand section inspired by the provided reference image */}
        <section className="lms-appear hidden pl-4 lg:flex lg:flex-col lg:items-start xl:pl-7">
          <div className="relative mb-8 flex h-[128px] w-[148px] items-center justify-center">
            <div
              className={`absolute inset-0 rotate-[-18deg] rounded-[39%_47%_42%_53%] ${
                darkMode ? "bg-violet-400/10" : "bg-[#ece8ff]"
              }`}
            />
            <GraduationCap
              className={`relative h-[96px] w-[96px] drop-shadow-[0_12px_9px_rgba(66,51,137,0.13)] ${
                darkMode ? "text-[#b2a4ff]" : "text-[#39337f]"
              }`}
              strokeWidth={1.55}
            />
          </div>

          <h1 className="text-[40px] font-bold leading-[1.15] tracking-[-0.045em] xl:text-[48px]">
            <span className={darkMode ? "text-[#ad9dff]" : "text-[#42358f]"}>
              LMS
            </span>{" "}
            Portal
          </h1>
          <div className="mt-6 h-[4px] w-[76px] rounded-full bg-[#9a84ed]" />
          <p
            className={`mt-6 max-w-[370px] text-[16px] leading-[1.8] xl:text-[17px] ${
              darkMode ? "text-[#b8b7d2]" : "text-[#636b87]"
            }`}
          >
            A unified learning platform for teachers and administrators.
          </p>
        </section>

        {/* Compact brand heading shown only on smaller screens */}
        <div className="lms-appear mx-auto flex items-center gap-2.5 lg:hidden">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              darkMode ? "bg-violet-400/15 text-violet-200" : "bg-[#f0edff] text-[#514199]"
            }`}
          >
            <GraduationCap className="h-6 w-6" strokeWidth={1.7} />
          </span>
          <span className="text-[18px] font-bold tracking-tight">LMS Portal</span>
        </div>

        {/* White rounded sign-in card */}
        <section
          className={`lms-appear relative isolate mx-auto w-full max-w-[510px] overflow-hidden rounded-[28px] border px-6 py-8 pb-[88px] transition-colors duration-300 sm:rounded-[32px] sm:px-10 sm:py-10 sm:pb-[88px] lg:static lg:isolation-auto lg:overflow-visible lg:pb-10 xl:px-11 ${
            darkMode
              ? "border-white/10 bg-[#20223a]/95 shadow-[0_24px_75px_rgba(0,0,0,0.28)]"
              : "border-white/90 bg-white/95 shadow-[0_24px_75px_rgba(77,55,155,0.13)]"
          }`}
          style={{ animationDelay: "90ms" }}
        >
          {/* Mobile/tablet only: animated lavender waves inside the bottom of the card.
              The original page-wide desktop waves remain untouched above. */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 z-0 h-[82px] w-full lg:hidden"
            viewBox="0 0 400 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0 48 C70 14 120 76 200 47 C285 18 340 57 400 32 L400 120 L0 120 Z"
              fill={darkMode ? "#6a56af" : "#e7e1ff"}
              opacity={darkMode ? "0.28" : "0.8"}
            >
              <animate
                attributeName="d"
                dur="12s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.25;0.5;0.75;1"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
                values={[
                  "M0 48 C70 14 120 76 200 47 C285 18 340 57 400 32 L400 120 L0 120 Z",
                  "M0 39 C70 37 130 53 200 42 C275 38 350 30 400 45 L400 120 L0 120 Z",
                  "M0 54 C65 15 125 68 200 50 C280 12 340 69 400 30 L400 120 L0 120 Z",
                  "M0 43 C75 31 145 59 200 36 C285 24 350 50 400 40 L400 120 L0 120 Z",
                  "M0 48 C70 14 120 76 200 47 C285 18 340 57 400 32 L400 120 L0 120 Z",
                ].join(";")}
              />
            </path>
            <path
              d="M0 72 C90 30 140 89 220 64 C300 46 330 70 400 48 L400 120 L0 120 Z"
              fill={darkMode ? "#8e79d1" : "#c5b8f8"}
              opacity={darkMode ? "0.24" : "0.55"}
            >
              <animate
                attributeName="d"
                dur="15s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.25;0.5;0.75;1"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
                values={[
                  "M0 72 C90 30 140 89 220 64 C300 46 330 70 400 48 L400 120 L0 120 Z",
                  "M0 61 C80 55 155 76 220 58 C290 41 355 74 400 60 L400 120 L0 120 Z",
                  "M0 75 C95 41 150 84 220 71 C295 48 340 56 400 49 L400 120 L0 120 Z",
                  "M0 65 C90 48 135 78 220 60 C290 56 345 65 400 55 L400 120 L0 120 Z",
                  "M0 72 C90 30 140 89 220 64 C300 46 330 70 400 48 L400 120 L0 120 Z",
                ].join(";")}
              />
            </path>
            <path
              d="M0 88 C75 65 150 100 240 80 C320 70 360 98 400 78 L400 120 L0 120 Z"
              fill={darkMode ? "#7158bf" : "#9a87ed"}
              opacity={darkMode ? "0.23" : "0.38"}
            >
              <animate
                attributeName="d"
                dur="18s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.25;0.5;0.75;1"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
                values={[
                  "M0 88 C75 65 150 100 240 80 C320 70 360 98 400 78 L400 120 L0 120 Z",
                  "M0 85 C80 78 165 85 240 86 C320 66 365 90 400 84 L400 120 L0 120 Z",
                  "M0 93 C70 60 155 98 240 76 C315 78 355 92 400 72 L400 120 L0 120 Z",
                  "M0 84 C75 73 160 95 240 83 C320 75 355 85 400 80 L400 120 L0 120 Z",
                  "M0 88 C75 65 150 100 240 80 C320 70 360 98 400 78 L400 120 L0 120 Z",
                ].join(";")}
              />
            </path>
          </svg>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-[20px] ${
                darkMode
                  ? "bg-[#363156] text-[#b3a5ff]"
                  : "bg-[#f0edff] text-[#45378f] shadow-[0_10px_24px_rgba(117,96,205,0.11)]"
              }`}
            >
              <GraduationCap className="h-[43px] w-[43px]" strokeWidth={1.65} />
            </div>
            <h2 className="mt-5 text-[27px] font-bold leading-tight tracking-[-0.035em] sm:text-[30px]">
              Welcome Back
            </h2>
            <p
              className={`mt-2 text-[12px] sm:text-[13px] ${
                darkMode ? "text-[#aeadca]" : "text-[#777d98]"
              }`}
            >
              Sign in to access the LMS Portal
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className={`mt-6 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12px] ${
                darkMode
                  ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5 sm:mt-9">
            {/* The field names/values/onChange/required validation are unchanged */}
            <div>
              <label htmlFor="id" className="mb-2 block text-[12px] font-semibold">
                Staff ID
              </label>
              <div
                className={`group flex h-[47px] items-center gap-3 rounded-xl border px-3.5 transition-all focus-within:border-[#9682e8] focus-within:ring-[3px] focus-within:ring-violet-400/10 ${
                  darkMode
                    ? "border-white/15 bg-[#262844] text-[#a6a7c5]"
                    : "border-[#e0e0eb] bg-white text-[#8a8fa9]"
                }`}
              >
                <UserRound className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
                <input
                  id="id"
                  type="text"
                  name="id"
                  value={credentials.id}
                  onChange={handleChange}
                  placeholder="Enter your staff ID"
                  autoComplete="username"
                  required
                  className={`lms-input h-full w-full min-w-0 bg-transparent text-[12.5px] outline-none ${
                    darkMode
                      ? "text-[#f3f0ff] placeholder:text-[#888ba9]"
                      : "text-[#222a4c] placeholder:text-[#9296ad]"
                  }`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[12px] font-semibold">
                Password
              </label>
              <div
                className={`group flex h-[47px] items-center gap-3 rounded-xl border px-3.5 transition-all focus-within:border-[#9682e8] focus-within:ring-[3px] focus-within:ring-violet-400/10 ${
                  darkMode
                    ? "border-white/15 bg-[#262844] text-[#a6a7c5]"
                    : "border-[#e0e0eb] bg-white text-[#8a8fa9]"
                }`}
              >
                <Lock className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className={`lms-input h-full w-full min-w-0 bg-transparent text-[12.5px] outline-none ${
                    darkMode
                      ? "text-[#f3f0ff] placeholder:text-[#888ba9]"
                      : "text-[#222a4c] placeholder:text-[#9296ad]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    darkMode ? "hover:bg-white/10" : "hover:bg-violet-50"
                  }`}
                >
                  {showPassword ? (
                    <EyeOff className="h-[17px] w-[17px]" />
                  ) : (
                    <Eye className="h-[17px] w-[17px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Preserved as the original UI-only checkbox, no new session logic */}
            <div className="flex items-center pt-0.5">
              <label
                className={`inline-flex cursor-pointer select-none items-center gap-2.5 text-[12px] ${
                  darkMode ? "text-[#d1d0e4]" : "text-[#414961]"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded-[5px] border-[#c9c7dd] accent-[#6345b4]"
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex h-[49px] w-full items-center justify-center gap-2 rounded-[18px] text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(87,58,170,0.19)] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#9a84ed]/30 active:scale-[0.99] ${
                loading
                  ? "cursor-not-allowed bg-[#8b75c4]"
                  : "bg-gradient-to-r from-[#6747ba] via-[#5940aa] to-[#4a3497] hover:brightness-110"
              }`}
            >
              <span>{loading ? "Logging in..." : "Login"}</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </button>
          </form>
        </section>
      </div>

      <p
        className={`relative z-10 mt-6 whitespace-nowrap text-[10px] lg:absolute lg:bottom-5 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2 ${
          darkMode ? "text-[#777998]" : "text-[#a5a6bb]"
        }`}
      >
        © {new Date().getFullYear()} LMS Portal. All rights reserved.
      </p>
    </main>
  );
}
