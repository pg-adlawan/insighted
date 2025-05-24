import React, { useState } from "react";
import { toast } from "react-hot-toast";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Handle Login/Register Submit Button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const endpoint = activeTab === "login" ? "/login" : "/register";
    const payload =
      activeTab === "login" ? { email, password } : { name, email, password };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (activeTab === "login") {
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("user", JSON.stringify(data.user));
          toast.success("Login successful!");

          const role = data.user.role;
          window.location.href = role === "admin" ? "/admin" : "/dashboard";
        } else {
          toast.success("Registration successful!");
          setActiveTab("login");
        }
      } else {
        toast.error(data.error || "Authentication failed.");
      }
    } catch (error) {
      toast.error("Something went wrong!");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-5xl flex flex-col md:flex-row bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        {/* Left Section: Auth Form */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          {/* Full-width pill tab switcher */}
          <div className="flex bg-gray-700 rounded-full w-full mb-6 p-1">
            <button
              onClick={() => setActiveTab("login")}
              className={`w-1/2 py-2 rounded-full transition-all duration-300 ${
                activeTab === "login"
                  ? "bg-blue-600 text-white"
                  : "text-white hover:text-blue-400"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`w-1/2 py-2 rounded-full transition-all duration-300 ${
                activeTab === "register"
                  ? "bg-blue-600 text-white"
                  : "text-white hover:text-blue-400"
              }`}
            >
              Register
            </button>
          </div>

          {/* Header */}
          <h2 className="text-white text-2xl font-semibold mb-4">
            {activeTab === "login" ? "Welcome Back" : "Join InsightEd"}
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {activeTab === "register" && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="mb-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold rounded-lg"
            >
              {activeTab === "login" ? "Sign In" : "Sign Up"}
            </button>
          </form>
        </div>

        {/* Right Section: Illustration */}
        <div className="hidden md:flex w-1/2 items-center justify-center bg-gradient-to-br from-blue-700 to-blue-500 p-8 text-white flex-col">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome to InsightEd 🎓
          </h2>
          <p className="text-center text-sm mb-4">
            Classify student temperaments. Visualize insights. <br />
            Deliver smarter teaching strategies.
          </p>
          {/* <img
            src="/welcome.svg"
            alt="Welcome Illustration"
            className="w-3/4 h-auto"
          /> */}
        </div>
      </div>
    </div>
  );
}
