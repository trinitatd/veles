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
      role: "Lead Full-Stack Developer",
      bio: "Spearheads the end-to-end application architecture, core API design, and real-time features. Passionate about performant web standards and clean code design.",
      avatar:
        "meme\client\public\logo.png",
      skills: ["React", "Node.js", "Express", "MongoDB", "Tailwind CSS"],
      github: "https://github.com",
      linkedin: "https://linkedin.com",
    },
    {
      id: 2,
      name: "Gauri Smiju",
      role: "Frontend Engineer & UI/UX Designer",
      bio: "Crafts delightful user interfaces, responsive design layouts, and accessible interaction patterns. Sarah designed the visual aesthetic and theme of the blog.",
      avatar:
        "meme\client\public\logo.png",
      skills: ["React", "Tailwind CSS", "UI/UX", "Figma", "Accessibility"],
      github: "https://github.com",
      linkedin: "https://linkedin.com",
    },
    {
      id: 3,
      name: "Yasina Thasneem M",
      role: "Backend Architect & Database Engineer",
      bio: "Architects scalable database schemas, query optimizations, and secure authentication flows. David ensures seamless data reliability and server resilience.",
      avatar:
        "meme\client\public\logo.png",
      skills: ["Node.js", "MongoDB", "Mongoose", "REST APIs", "Clerk Auth"],
      github: "https://github.com",
      linkedin: "https://linkedin.com",
    },
    {
      id: 4,
      name: "Vivek R",
      role: "DevOps & Cloud Infrastructure Engineer",
      bio: "Automates continuous deployment pipelines, environment configurations, asset delivery, and cloud monitoring to maintain 99.9% platform uptime.",
      avatar:
        "meme\client\public\logo.png",
      skills: ["Docker", "CI/CD", "Cloud Architecture", "Vite", "ImageKit"],
      github: "https://github.com",
      linkedin: "https://linkedin.com",
    },
  ],
};

const AboutPage = () => {
  return (
    <div className="mt-4 flex flex-col gap-12 pb-20">
      {/* BREADCRUMB */}
      <div className="flex gap-4 text-[#2f4b3a] text-sm md:text-base font-medium">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        <span>•</span>
        <span className="text-green-800 font-semibold">About Us</span>
      </div>

      {/* HERO / INTRO SECTION */}
      <section className="relative overflow-hidden rounded-3xl border border-[#2f4b3a]/15 bg-gradient-to-br from-[#d9e6df] via-[#e5f3f1] to-[#d6ece4] p-8 md:p-14 shadow-sm">
        {/* Subtle decorative background circles */}
       
        <div className="relative max-w-4xl">
          <span className="inline-block rounded-full bg-emerald-800/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-emerald-900 border border-emerald-700/20 mb-4">
            {aboutContent.badge}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-[Philosopher] text-[#153252] leading-tight">
            {aboutContent.title}
          </h1>
          <p className="mt-6 text-base md:text-xl font-['Della_Respira'] text-gray-700 leading-relaxed">
            {aboutContent.paragraph}
          </p>

         
        </div>
      </section>

      {/* CORE HIGHLIGHTS / MISSION PILLARS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {aboutContent.highlights.map((item, idx) => (
          <div
            key={idx}
            className="group rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:border-emerald-600/30 transition-all duration-300"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h2 className="text-xl font-bold text-gray-800 font-[Philosopher] mb-2">
              {item.title}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </section>

      {/* DEVELOPERS SECTION */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
         
          <h2 className="text-3xl md:text-4xl font-bold font-[Philosopher] text-[#153252]">
            Meet the Developers
          </h2>
          
        </div>

        {/* 4 DEVELOPERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aboutContent.developers.map((dev) => (
            <div
              key={dev.id}
              className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-sm p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
            >
              <div>
                {/* Avatar with gradient ring */}
                <div className="relative mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-[#153252] shadow-md group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={dev.avatar}
                    alt={dev.name}
                    className="h-full w-full rounded-full object-cover bg-gray-100"
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
                  <h3 className="text-xl font-bold text-gray-900 font-[Philosopher]">
                    {dev.name}
                  </h3>
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/70">
                    {dev.role}
                  </span>
                </div>

                {/* Bio */}
                <p className="mt-4 text-xs md:text-sm text-gray-600 leading-relaxed text-center">
                  {dev.bio}
                </p>

                {/* Skills Badges */}
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  {dev.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Social / Contact Links */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-gray-500">
                {/* GitHub */}
                {dev.github && (
                  <a
                    href={dev.github}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full hover:bg-gray-100 hover:text-black transition-colors"
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
                    className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
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

