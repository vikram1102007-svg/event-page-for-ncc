/* NCC Event PDF Certificate Generator using jsPDF */
(function () {
  function generateCertificatePdf(data, cfg) {
    const jspdfNS = window.jspdf;
    if (!jspdfNS || typeof jspdfNS.jsPDF !== 'function') {
      return { ok: false, msg: 'PDF library (jsPDF) is not loaded. Check your internet connection and retry.' };
    }

    const config = cfg || window.NCC_CONFIG || {};
    const doc = new jspdfNS.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = 297;
    const h = 210;

    // White paper + Navy Blue (#0b1f3a) & NCC Gold (#d4af37) frame
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, w, h, 'F');

    doc.setDrawColor(11, 31, 58);
    doc.setLineWidth(2.4);
    doc.rect(10, 10, w - 20, h - 20);

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.9);
    doc.rect(14, 14, w - 28, h - 28);

    // Top Navy Banner
    doc.setFillColor(11, 31, 58);
    doc.rect(14, 14, w - 28, 30, 'F');

    doc.setTextColor(212, 175, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(String(config.NCC_UNIT || 'NATIONAL CADET CORPS').toUpperCase(), w / 2, 24, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(String(data.collegeName || config.COLLEGE_NAME || 'COLLEGE NCC UNIT').toUpperCase(), w / 2, 35, { align: 'center' });

    // Title
    doc.setTextColor(11, 31, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('CERTIFICATE OF PARTICIPATION', w / 2, 64, { align: 'center' });

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1.1);
    doc.line(90, 70, w - 90, 70);

    // Participant Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(55, 72, 95);
    doc.text('This certificate is awarded to', w / 2, 84, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(11, 31, 58);
    doc.text(String(data.participantName || 'Participant'), w / 2, 97, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(55, 72, 95);
    const teamLine = [
      data.teamName ? 'Team: ' + data.teamName : '',
      data.collegeName ? 'College: ' + data.collegeName : ''
    ].filter(Boolean).join('   |   ');
    if (teamLine) {
      doc.text(teamLine, w / 2, 108, { align: 'center' });
    }

    doc.setFontSize(13);
    doc.text('for active participation in the NCC Two-Day Event', w / 2, 121, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(22, 53, 97);
    doc.text(String(data.eventTitle || 'NCC Event'), w / 2, 133, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(55, 72, 95);
    doc.text('Event Date: ' + String(data.eventDate || 'TBA'), w / 2, 143, { align: 'center' });

    // Bottom: Certificate Number & Authorized Signatory
    const issuedDate = data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) : new Date().toLocaleDateString('en-IN');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 31, 58);
    doc.text('Certificate Number: ' + String(data.certificateNumber || 'N/A'), 28, 172);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 91, 117);
    doc.text('Issued Date: ' + issuedDate, 28, 179);
    if (data.registrationCode) {
      doc.text('Registration ID: ' + String(data.registrationCode), 28, 186);
    }

    doc.setDrawColor(11, 31, 58);
    doc.setLineWidth(0.5);
    doc.line(w - 98, 171, w - 28, 171);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(11, 31, 58);
    doc.text(String(config.SIGNATORY_NAME || 'Associate NCC Officer (ANO)'), w - 63, 178, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 91, 117);
    doc.text(String(config.SIGNATORY_TITLE || 'Authorized Signatory, NCC Unit'), w - 63, 184, { align: 'center' });

    const safeFile = String(data.certificateNumber || 'ncc-certificate').replace(/[^a-z0-9_-]/gi, '_');
    doc.save(safeFile + '.pdf');
    return { ok: true };
  }

  window.NCCCert = {
    generateCertificatePdf: generateCertificatePdf
  };
})();
