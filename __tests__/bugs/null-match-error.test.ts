
const parseInterface = (desc: any = "") => {
    const safeDesc = desc || "";
    const match = safeDesc.match(/^(\d+)x\s*(.*)$/);
    if (match) {
        return { qty: match[1], type: match[2] };
    }
    return { qty: "", type: safeDesc };
};

console.log("Starting verification test...");

try {
    console.log("Testing with valid string '1x GbE RJ45':", parseInterface("1x GbE RJ45"));
    console.log("Testing with empty string '':", parseInterface(""));
    console.log("Testing with null (THIS SHOULD NOW WORK):", parseInterface(null));
    console.log("Testing with undefined:", parseInterface(undefined));

    const nullResult = parseInterface(null);
    if (nullResult.qty === "" && nullResult.type === "") {
        console.log("Verification successful! No error thrown and correct default returned.");
        process.exit(0);
    } else {
        console.error("Verification failed! Unexpected result:", nullResult);
        process.exit(1);
    }
} catch (e: any) {
    console.error("VERIFICATION FAILED! Error thrown:", e.message);
    process.exit(1);
}
