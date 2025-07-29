import { NodeWarning } from "components/components/warnings/warnings.rulesets";
import { useWarning } from "components/providers/WarningsProvider"

export default function NodeContainer({ nodeId, children }) {
    const { notifications } = useWarning()

    const severityPriority = {
        info: 1,
        warn: 2,
        danger: 3,
    };

    const severityBorderClass: Record<keyof typeof severityPriority, string> = {
        info: "border-blue-400",
        warn: "border-yellow-500",
        danger: "border-red-500",
    };

    function getHighestSeverityForNode(
        nodeId: string,
        notifications: NodeWarning[]
    ): keyof typeof severityPriority | null {
        let highest: keyof typeof severityPriority | null = null;

        for (const note of notifications) {
            if (note.nodes?.includes(nodeId)) {
                if (
                    !highest ||
                    severityPriority[note.level ?? "info"] > severityPriority[highest]
                ) {
                    highest = note.level ?? "info";
                }
            }
        }

        return highest;
    }


    const severity = getHighestSeverityForNode(nodeId, notifications)
    const borderClass = severity ? severityBorderClass[severity] : 'border-mute'

    return (
        <div className={`border-1 p-2 bg-[#fff] shadow-md min-w-[350px] rounded-md ${borderClass}`}>
            {children}
        </div>
    )
}
