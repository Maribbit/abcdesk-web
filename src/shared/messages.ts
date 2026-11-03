export interface OpenWorkspaceMessage {
  type: "OPEN_WORKSPACE";
  abcText: string;
}

export function createOpenWorkspaceMessage(abcText: string): OpenWorkspaceMessage {
  return {
    type: "OPEN_WORKSPACE",
    abcText,
  };
}

export function isOpenWorkspaceMessage(
  message: unknown
): message is OpenWorkspaceMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "OPEN_WORKSPACE" &&
    "abcText" in message &&
    typeof message.abcText === "string"
  );
}