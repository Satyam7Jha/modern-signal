import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import CSV · Task List" };

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import tasks"
        description="Upload a CSV file. Valid rows are imported together; every other row is listed with the reason."
      />
      <ImportForm />
    </div>
  );
}
