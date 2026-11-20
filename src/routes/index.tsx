import { createFileRoute } from "@tanstack/react-router";
import { SurveyApp } from "@/components/survey/survey-app";

export const Route = createFileRoute("/")({
  component: SurveyApp,
});
