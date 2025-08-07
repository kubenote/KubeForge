import Flow from "components/components/flow/flow.component";
import MainSidebar from "components/components/sidebar/sidebar.component";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
        <MainSidebar>
          <Flow />
        </MainSidebar>
    </div>
  );
}
