import { jsxs as _jsxs } from "react/jsx-runtime";
export const FPSDisplay = ({ inputFPS, outputFPS, style }) => {
    const defaultStyle = {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
        zIndex: 1000,
        ...style
    };
    return (_jsxs("div", { style: defaultStyle, children: [_jsxs("div", { children: ["Input: ", inputFPS, " FPS"] }), _jsxs("div", { children: ["Output: ", outputFPS, " FPS"] })] }));
};
//# sourceMappingURL=FPSDisplay.js.map