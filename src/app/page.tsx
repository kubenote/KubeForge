import { ReactFlowProvider } from "@xyflow/react";
import Flow from "components/components/flow/flow.component";
import MainSidebar from "components/components/sidebar/sidebar.component";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <ReactFlowProvider>
        <MainSidebar>
          <Flow />
        </MainSidebar>
      </ReactFlowProvider>
    </div>
  );
}
