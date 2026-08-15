import { Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import Home from "./pages/Home.tsx";
import Search from "./pages/Search.tsx";
import Thread from "./pages/Thread.tsx";
import About from "./pages/About.tsx";
import Methodology from "./pages/Methodology.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Support from "./pages/Support.tsx";
import NotFound from "./pages/NotFound.tsx";
import Digests from "./pages/Digests.tsx";
import Digest from "./pages/Digest.tsx";
import ChannelIndex from "./pages/ChannelIndex.tsx";
import PatchFeed from "./pages/PatchFeed.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="patches" element={<Navigate to="/" replace />} />
        <Route path="topics" element={<ChannelIndex kind="topic" />} />
        <Route path="vendors" element={<ChannelIndex kind="vendor" />} />
        <Route path="topics/:slug" element={<PatchFeed kind="topic" />} />
        <Route path="vendors/:slug" element={<PatchFeed kind="vendor" />} />
        <Route path="threads/:id" element={<Thread />} />
        <Route path="digests" element={<Digests />} />
        <Route path="digests/:period/:key" element={<Digest />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="about" element={<About />} />
        <Route path="about/methodology" element={<Methodology />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="support" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
