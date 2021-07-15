const markdownpdf = require("markdown-pdf");

markdownpdf().from("./notes/lectures.md").to("./dist/namaste-javascript-notes.pdf", () => {
    console.log("Pdf Generated Successfully");
});