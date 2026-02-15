
const parseInterface = (desc: unknown = "") => {
    const safeDesc = (desc as string) || "";
    const match = safeDesc.match(/^(\d+)x\s*(.*)$/);
    if (match) {
        return { qty: match[1], type: match[2] };
    }
    return { qty: "", type: safeDesc };
};

describe("Bugfix: null-match-error", () => {
    it("should handle valid string '1x GbE RJ45'", () => {
        expect(parseInterface("1x GbE RJ45")).toEqual({ qty: "1", type: "GbE RJ45" });
    });

    it("should handle empty string ''", () => {
        expect(parseInterface("")).toEqual({ qty: "", type: "" });
    });

    it("should handle null and not throw", () => {
        expect(parseInterface(null)).toEqual({ qty: "", type: "" });
    });

    it("should handle undefined", () => {
        expect(parseInterface(undefined)).toEqual({ qty: "", type: "" });
    });
});
