from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=16)
pdf.cell(200, 10, txt="Test PDF for AI Tutor Application", ln=1, align="C")
pdf.set_font("Arial", size=12)
pdf.cell(200, 10, txt="This is a sample PDF document created for testing purposes.", ln=1, align="L")
pdf.cell(200, 10, txt="It contains multiple lines of text to test the PDF viewer", ln=1, align="L")
pdf.cell(200, 10, txt="and AI annotation capabilities.", ln=1, align="L")
pdf.output("test.pdf")
