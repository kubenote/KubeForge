import Flow from "components/components/flow/flow.main.component";
import MainSidebar from "components/components/sidebar/sidebar.main.component";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
        <MainSidebar>
          <Flow />
        </MainSidebar>
    </div>
  );
}
