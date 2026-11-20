import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SurveyApp } from "@/components/survey/survey-app";
import "@/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <SurveyApp />
    </StrictMode>,
  );
}
