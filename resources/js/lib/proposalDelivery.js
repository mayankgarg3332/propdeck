export async function exportProposalPdf() {
  throw new Error("PDF export adapter is not wired yet. The UI contract is ready for html2canvas + jsPDF.");
}

export async function sendProposalEmail() {
  throw new Error("Use api.sendProposalEmail() — proposals are sent via the server using your saved SMTP settings.");
}
