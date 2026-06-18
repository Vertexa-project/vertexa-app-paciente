import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import FloatingChatButton from "@/components/FloatingChatButton";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage";
import Progress from "./pages/Progress";
import Plan from "./pages/Plan";
import Habits from "./pages/Habits";
import Records from "./pages/Records";
import Achievements from "./pages/Achievements";
import Journey from "./pages/Journey";
import SOS from "./pages/SOS";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import WorkoutGuide from "./pages/WorkoutGuide";
import Challenges from "./pages/Challenges";
import TeamChat from "./pages/TeamChat";
import ShareStory from "./pages/ShareStory";
import ChallengeCheckIn from "./pages/ChallengeCheckIn";
import LogActivity from "./pages/LogActivity";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <FloatingChatButton />
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/workout-guide" element={<WorkoutGuide />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/team-chat" element={<TeamChat />} />
          <Route path="/share" element={<ShareStory />} />
          <Route path="/challenge-checkin" element={<ChallengeCheckIn />} />
          <Route path="/log-activity" element={<LogActivity />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/records" element={<Records />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/sos" element={<SOS />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
