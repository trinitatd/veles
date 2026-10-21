import { Link } from "react-router-dom";

/* =========================================================================
   ABOUT PAGE CONTENT & DEVELOPER DETAILS (YOU CAN MODIFY EVERYTHING HERE)
   ========================================================================= */

export const aboutContent = {
  badge: "About Our Platform",
  title: "About the Veles Blog",
  // Main introductory paragraph
  paragraph:
    "Welcome to our blogging and ideas platform, created by a team of four S5 IT students from Government Engineering College, Barton Hill, as part of our Web Application Development microproject. Our platform provides a space for developers and creators to share ideas, technical knowledge, tutorials, and experiences while learning together through a community-driven environment.",

  // Platform highlights & values
  highlights: [
  {
    title: "MERN Stack",
    description:
      "Built using MongoDB, Express.js, React, and Node.js to create a modern and scalable full-stack web application.",
  },
  {
    title: "Interactive Blogging",
    description:
      "Users can create, publish, explore, and discuss technical articles and ideas through an engaging blogging platform.",
  },
  {
    title: "Full-Stack Development",
    description:
      "Combines a responsive React frontend with a Node.js and Express backend, connected to MongoDB for efficient data management.",
  },
],

  // 4 Developers details
  developers: [
{
  id: 1,
  name: "Trinita T D",
  role: "Lead Integration & Deployment Engineer",
  bio: "Leads the integration of frontend and backend components, manages deployment workflows, and ensures seamless communication between application services. Focused on reliable deployments, production readiness, and end-to-end system integration.",
  avatar: "/profile-pic.png",
  skills: [
    "Full-Stack Integration",
    "Deployment & Hosting",
    "React",
    "Node.js",
    "MongoDB",
    "Git & GitHub"
  ],
  github: "https://github.com",
  linkedin: "https://linkedin.com",
},
  
{
  id: 2,
  name: "Gauri Smiju",
  role: "Database Engineer",
  bio: "Designs and manages the database architecture, ensures efficient data storage and retrieval, and maintains data consistency and integrity. Focused on database performance, schema design, and reliable data management for Veles.",
  avatar: "/profile-pic.png",
  skills: [
    "MongoDB",
    "Mongoose",
    "Database Design",
    "Schema Modeling",
    "Query Optimization",
    "Data Integrity"
  ],
  github: "https://github.com",
  linkedin: "https://linkedin.com",
},
{
  id: 3,
  name: "Yasina Thasneem M",
  role: "Backend Engineer",
  bio: "Develops and manages the server-side infrastructure of Veles, implementing RESTful APIs, business logic, and secure authentication flows. Focused on backend reliability, API performance, and seamless communication between the frontend and database.",
  avatar: "/profile-pic.png",
  skills: [
    "Node.js",
    "Express.js",
    "REST APIs",
    "Clerk Auth",
    "API Security",
    "Server Management"
  ],
  github: "https://github.com",
  linkedin: "https://linkedin.com",
},
{
  id: 4,
  name: "Vivek R",
  role: "Frontend Engineer",
  bio: "Develops and maintains the user-facing interface of Veles, creating responsive layouts, reusable UI components, and intuitive user interactions. Focused on visual consistency, accessibility, and delivering a smooth user experience across devices.",
  avatar: "/profile-pic.png",
  skills: [
    "React",
    "JavaScript",
    "Tailwind CSS",
    "Responsive Web Design",
    "UI Components",
    "Frontend Optimization"
  ],
  github: "https://github.com",
  linkedin: "https://linkedin.com",
},
  ],
};

const AboutPage = () => {
  return (
    <div className="mt-4 flex flex-col gap-12 pb-20">
      {/* BREADCRUMB */}
      <div className="flex gap-4 text-[#2f4b3a] dark:text-[#7BC98C] text-sm md:text-base font-medium">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        <span>•</span>
        <span className="text-green-800 dark:text-[#7BC98C] font-semibold">About Us</span>
      </div>

      {/* HERO / INTRO SECTION */}
      <section className="relative overflow-hidden rounded-3xl border border-[#2f4b3a]/15 dark:border-[#35443A] bg-gradient-to-br from-[#d9e6df] via-[#e5f3f1] to-[#d6ece4] dark:from-[#1B241E] dark:via-[#162019] dark:to-[#111713] p-8 md:p-14 shadow-sm">
        {/* Subtle decorative background circles */}
       
        <div className="relative max-w-4xl">
          <span className="inline-block rounded-full bg-emerald-800/10 dark:bg-[#25382B] px-4 py-1.5 text-xs md:text-sm font-semibold text-emerald-900 dark:text-[#7BC98C] border border-emerald-700/20 dark:border-[#35443A] mb-4">
            {aboutContent.badge}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-[Philosopher] text-[#153252] dark:text-[#E5E9E4] leading-tight">
            {aboutContent.title}
          </h1>
          <p className="mt-6 text-base md:text-xl font-['Della_Respira'] text-gray-700 dark:text-[#A5B0A7] leading-relaxed">
            {aboutContent.paragraph}
          </p>

         
        </div>
      </section>

      {/* CORE HIGHLIGHTS / MISSION PILLARS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {aboutContent.highlights.map((item, idx) => (
          <div
            key={idx}
            className="group rounded-2xl border border-gray-200/80 dark:border-[#35443A] bg-white/80 dark:bg-[#1B241E] backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:border-emerald-600/30 dark:hover:border-[#7BC98C]/50 transition-all duration-300"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-[#E5E9E4] font-[Philosopher] mb-2">
              {item.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-[#A5B0A7] leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </section>

      {/* DEVELOPERS SECTION */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
         
          <h2 className="text-3xl md:text-4xl font-bold font-[Philosopher] text-[#153252] dark:text-[#E5E9E4]">
            Meet the Developers
          </h2>
          
        </div>

        {/* 4 DEVELOPERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aboutContent.developers.map((dev) => (
            <div
              key={dev.id}
              className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 dark:border-[#35443A] bg-white/90 dark:bg-[#1B241E] backdrop-blur-sm p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
            >
              <div>
                {/* Avatar with gradient ring */}
                <div className="relative mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-[#153252] shadow-md group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={dev.avatar}
                    alt={dev.name}
                    className="h-full w-full rounded-full object-cover bg-gray-100 dark:bg-[#222D25]"
                    onError={(e) => {
                      // Fallback image if external URL fails
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        dev.name
                      )}&background=153252&color=fff&size=200`;
                    }}
                  />
                </div>

                {/* Name & Role */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-[#E5E9E4] font-[Philosopher]">
                    {dev.name}
                  </h3>
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 dark:bg-[#25382B] px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-[#7BC98C] border border-emerald-200/70 dark:border-[#35443A]">
                    {dev.role}
                  </span>
                </div>

                {/* Bio */}
                <p className="mt-4 text-xs md:text-sm text-gray-600 dark:text-[#A5B0A7] leading-relaxed text-center">
                  {dev.bio}
                </p>

                {/* Skills Badges */}
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  {dev.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded-md bg-gray-100 dark:bg-[#222D25] px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-[#A5B0A7] hover:bg-emerald-50 dark:hover:bg-[#25382B] hover:text-emerald-700 dark:hover:text-[#7BC98C] transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Social / Contact Links */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#35443A] flex items-center justify-center gap-4 text-gray-500 dark:text-[#A5B0A7]">
                {/* GitHub */}
                {dev.github && (
                  <a
                    href={dev.github}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222D25] hover:text-black dark:hover:text-[#E5E9E4] transition-colors"
                    title="GitHub"
                    aria-label={`${dev.name}'s GitHub`}
                  >
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </a>
                )}

                {/* LinkedIn */}
                {dev.linkedin && (
                  <a
                    href={dev.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-[#222D25] hover:text-blue-600 dark:hover:text-[#7BC98C] transition-colors"
                    title="LinkedIn"
                    aria-label={`${dev.name}'s LinkedIn`}
                  >
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                )}

                {/* Email 
                {dev.email && (
                  <a
                    href={`mailto:${dev.email}`}
                    className="p-2 rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    title="Send Email"
                    aria-label={`Email ${dev.name}`}
                  >
                    <svg
                      className="h-5 w-5 fill-none stroke-current stroke-2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </a>
                )}*/}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CTA SECTION */}
      
    </div>
  );
};

export default AboutPage;

