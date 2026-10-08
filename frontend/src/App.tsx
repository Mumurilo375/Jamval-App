import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import { RouterProvider } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <Analytics />
    </AppProviders>
  );
}

export default App;
