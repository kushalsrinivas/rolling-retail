import { createStart } from "@tanstack/react-start";
import { gateMiddleware } from "./lib/gate";

export const startInstance = createStart(() => ({
	requestMiddleware: [gateMiddleware],
}));
