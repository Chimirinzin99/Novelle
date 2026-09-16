
export default function Home() {
  return (
    <main className="flex h-screen overflow-hidden bg-gray-200">

      {/* Sidebar */}
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-white px-4 py-6 shadow-sm">

        {/* Logo */}
        <div className="mb-8 shrink-0 px-3">
          <h1 className="text-2xl font-bold text-blue-600">
            Novelle
          </h1>

          <p className="mt-1 text-xs text-gray-500">
            CST Student Platform
          </p>
        </div>

        {/* Home */}
        <nav className="shrink-0">
          <a
            href="/"
            className="flex w-full items-center rounded-lg bg-blue-100 px-3 py-2.5 text-sm font-medium text-blue-700"
          >
            Home
          </a>
        </nav>

        {/* Resources */}
        <div className="mt-8 shrink-0">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Resources
          </p>

          <nav className="space-y-1">
            <a
              href="#"
              className="flex w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
            >
              Notes
            </a>

            <a
              href="#"
              className="flex w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
            >
              Past Papers
            </a>

            <a
              href="#"
              className="flex w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
            >
              Upload Notes
            </a>
          </nav>
        </div>

        {/* Programmes */}
        <div className="mt-8 flex min-h-0 flex-1 flex-col">

          <p className="mb-2 shrink-0 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Programmes
          </p>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">

            <a
              href="/programmes/civil-engineering"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Civil Engineering
            </a>

            <a
              href="/programmes/electrical-engineering"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Electrical Engineering
            </a>

            <a
              href="/programmes/ece"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Electronics and Communication Engineering (ECE)
            </a>

            <a
              href="/programmes/information-technology"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Information Technology (IT)
            </a>

            <a
              href="/programmes/architecture"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Architecture
            </a>

            <a
              href="/programmes/engineering-geology"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Engineering Geology
            </a>

            <a
              href="/programmes/instrumentation-and-control-engineering"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Instrumentation and Control Engineering (ICE)
            </a>

            <a
              href="/programmes/water-resources-engineering"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Water Resources Engineering (WRE)
            </a>

            <a
              href="/programmes/mechanical-engineering"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Mechanical Engineering
            </a>

            <a
              href="/programmes/software-engineering"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
            >
              Software Engineering
            </a>

          </nav>
        </div>

        {/* Bottom */}
        <div className="mt-4 shrink-0 border-t pt-4">

          <a
            href="#"
            className="block w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
          >
            Settings
          </a>

          <a
            href="#"
            className="mt-1 block w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
          >
            Profile
          </a>

        </div>

      </aside>

      {/* Main Content */}
      <section className="min-w-0 flex-1 overflow-y-auto px-8 py-10">

        <div className="mx-auto max-w-7xl">

          {/* Welcome */}
          <div className="text-center">

            <h1 className="text-4xl font-bold text-gray-900">
              Welcome to{" "}
              <span className="text-blue-600">
                Novelle
              </span>
            </h1>

            <p className="mt-2 text-gray-500">
              Find notes and learning resources from CST students.
            </p>

            {/* Search */}
            <div className="mx-auto mt-7 max-w-2xl">

              <input
                type="text"
                placeholder="Search notes, modules, programmes..."
                className="w-full rounded-2xl border border-black bg-white px-5 py-4 text-sm !text-black placeholder:!text-gray-500 shadow-md outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

            </div>

          </div>

          {/* Available Notes */}
          <div className="mt-12">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Available Notes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Browse recently available study materials.
                </p>
              </div>

              <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                View all →
              </button>

            </div>

            {/* Notes */}
            <div className="max-h-[520px] overflow-y-auto pr-3">

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

                {/* Note 1 */}
                <div className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

                  <h3 className="text-sm font-semibold text-gray-900">
                    Introduction to Programming
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Programming fundamentals and basic concepts.
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Software Engineering</span>
                    <span>Year 1</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t pt-3">

                    <button className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700">
                      View
                    </button>

                    <button className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Download
                    </button>

                    <button className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500">
                      ♡
                    </button>

                  </div>
                </div>

                {/* Note 2 */}
                <div className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

                  <h3 className="text-sm font-semibold text-gray-900">
                    Database Management Systems
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    SQL, relational databases and database concepts.
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Software Engineering</span>
                    <span>Year 1</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t pt-3">

                    <button className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700">
                      View
                    </button>

                    <button className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Download
                    </button>

                    <button className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500">
                      ♡
                    </button>

                  </div>
                </div>

                {/* Note 3 */}
                <div className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

                  <h3 className="text-sm font-semibold text-gray-900">
                    Engineering Mathematics
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Important mathematical concepts for engineering.
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Common Module</span>
                    <span>Year 1</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t pt-3">

                    <button className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700">
                      View
                    </button>

                    <button className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Download
                    </button>

                    <button className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500">
                      ♡
                    </button>

                  </div>
                </div>

                {/* Note 4 */}
                <div className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

                  <h3 className="text-sm font-semibold text-gray-900">
                    Computer Networks
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Networking fundamentals, protocols and models.
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Information Technology</span>
                    <span>Year 2</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t pt-3">

                    <button className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700">
                      View
                    </button>

                    <button className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Download
                    </button>

                    <button className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500">
                      ♡
                    </button>

                  </div>
                </div>

                {/* Note 5 */}
                <div className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

                  <h3 className="text-sm font-semibold text-gray-900">
                    Data Structures
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Arrays, linked lists, stacks, queues and trees.
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Software Engineering</span>
                    <span>Year 2</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t pt-3">

                    <button className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700">
                      View
                    </button>

                    <button className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Download
                    </button>

                    <button className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500">
                      ♡
                    </button>

                  </div>
                </div>

                {/* Note 6 */}
                <div className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

                  <h3 className="text-sm font-semibold text-gray-900">
                    Software Engineering
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Software development processes and methodologies.
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Software Engineering</span>
                    <span>Year 2</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t pt-3">

                    <button className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700">
                      View
                    </button>

                    <button className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Download
                    </button>

                    <button className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500">
                      ♡
                    </button>

                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
