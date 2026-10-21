import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./utils/api.js";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Homepage from "./routes/Homepage.jsx";
import PostListPage from "./routes/PostListPage.jsx";
import Write from "./routes/Write.jsx";
import Dashboard from "./routes/Dashboard.jsx";
import EditPost from "./routes/EditPost.jsx";
import LoginPage from "./routes/LoginPage.jsx";
import RegisterPage from "./routes/RegisterPage.jsx";
import SinglePostPage from "./routes/SinglePostPage.jsx";
import AboutPage from "./routes/AboutPage.jsx";
import AuthorProfilePage from "./routes/AuthorProfilePage.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminOverview from "./routes/admin/AdminOverview.jsx";
import AdminPosts from "./routes/admin/AdminPosts.jsx";
import AdminComments from "./routes/admin/AdminComments.jsx";
import AdminUsers from "./routes/admin/AdminUsers.jsx";
import AdminChannels from "./routes/admin/AdminChannels.jsx";
import ChannelsPage from "./routes/ChannelsPage.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminOverview />,
      },
      {
        path: "posts",
        element: <AdminPosts />,
      },
      {
        path: "comments",
        element: <AdminComments />,
      },
      {
        path: "users",
        element: <AdminUsers />,
      },
      {
        path: "channels",
        element: <AdminChannels />,
      },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Homepage />,
      },
      {
        path: "/posts",
        element: <PostListPage />,
      },
      {
        path: "/write",
        element: <Write />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/edit/:id",
        element: <EditPost />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        path: "/about",
        element: <AboutPage />,
      },
      {
        path: "/channels",
        element: <ChannelsPage />,
      },
      {
        path: "/channels/:slug",
        element: <ChannelsPage />,
      },
      {
        path: "/author/:username",
        element: <AuthorProfilePage />,
      },
      {
        path: "/:slug",
        element: <SinglePostPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
          <ToastContainer position="bottom-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>
);
