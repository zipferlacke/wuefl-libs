import { showBanner } from "../banner/banner.js";
import { userDialog } from "../userDialog/userDialog.js";

const STATUS = { 0: "success", 1: "error", 2: "warning", 3: "info" };

export async function dataConnection(url, request, data = "", files = null) {
    const formData = new FormData();
    formData.append("request", JSON.stringify(request));

    if (data !== "") {
        formData.append("data", JSON.stringify(data));
    }

    if (files) {
        files.forEach((file, i) => formData.append(`${i}`, file));
    }

    try {
        const res = await fetch(url, { method: "POST", body: formData });
        const result = await res.json();

        if (result[0] === 4) { // Hintergrundprozess kommt in den Vordergrund
            const dialogResult = await userDialog({
                title: result[1]["titel"],
                content: result[1]["content"],
                confirmText: result[1]["confirmText"],
                detailReturn: true,
            });

            if (!dialogResult.submit) {
                showBanner("Hintergrundprocess Fehler, falsch in den Vordergrund gekommen", "error");
                return null; // Abgebrochen
            }
            // FormData → Object
            return dataConnection(url, request, { ...data, ...dialogResult.data }, files);
        }else if (result[0] !== 0) {
            showBanner(result[1], STATUS[result[0]]);
            return null;
        }

        return result[1] ?? null;
    } catch (e) {
        console.error(e);
        showBanner("Verbindungsfehler – bitte Internetverbindung prüfen.", "error");
        return null;
    }
}