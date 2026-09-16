export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome to Novelle</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to access your CST resources
          </p>
        </div>

        <form className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              CST Email
            </label>

            <input
              type="email"
              placeholder="yourname@cst.edu.bt"
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black py-3 font-medium text-white hover:bg-gray-800"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <a href="/register" className="font-medium text-black hover:underline">
            Register
          </a>
        </p>
      </div>
    </main>
  );
}