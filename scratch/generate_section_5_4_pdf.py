import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
import shutil

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#4A5568"))
        
        # Header rule and text
        self.drawString(54, 842 - 36, "DEPARTMENT OF AIML, CANARA ENGINEERING COLLEGE, MANGALURU")
        self.drawRightString(595 - 54, 842 - 36, "CHAPTER 5: SYSTEM IMPLEMENTATION")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.8)
        self.line(54, 842 - 42, 595 - 54, 842 - 42)

        # Footer rule and text
        self.line(54, 46, 595 - 54, 46)
        self.setFont("Helvetica", 8)
        self.drawString(54, 34, "Digital Twin-Based Real-Time Wildfire Detection and Prediction Using U-Net Model")
        self.drawRightString(595 - 54, 34, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf():
    pdf_path = r"D:\Land8Fire-DigitalTwin\Section_5_4_Coding_Pseudocodes.pdf"
    public_path = r"D:\Land8Fire-DigitalTwin\public\Section_5_4_Coding_Pseudocodes.pdf"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10.5,
        leading=14.2,
        textColor=colors.HexColor('#111827'),
        alignment=4,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10,
        leading=13.8,
        textColor=colors.HexColor('#111827'),
        alignment=4,
        leftIndent=14,
        spaceAfter=4
    )

    code_title_style = ParagraphStyle(
        'CodeTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#0F172A')
    )

    code_io_style = ParagraphStyle(
        'CodeIO',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#334155')
    )

    code_body_style = ParagraphStyle(
        'CodeBody',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.8,
        leading=10.2,
        textColor=colors.HexColor('#0F172A')
    )

    story = []

    # PAGE 1: Section 5.4.1 & 5.4.2
    story.append(Paragraph("5.4 Coding and Pseudocodes", title_style))
    story.append(Paragraph("<b>5.4.1 Introduction</b>", h1_style))
    story.append(Paragraph(
        "The coding phase converts system design specifications into executable software modules across "
        "the frontend presentation layers, geospatial visualizers, satellite-data ingestion pipelines, "
        "deep learning inference services, and environmental fire-spread simulation models. "
        "The client application manages user interactions and visualizes situational intelligence across both "
        "continental 3D globe (CesiumJS) and photorealistic local forest (Three.js) scales. "
        "The backend Python service processes 15-channel Sentinel-2 satellite granules to generate U-Net burned-area "
        "segmentation masks. Simultaneously, an independent fire-spread simulation module calculates hypothetical "
        "fire propagation perimeters based on terrain and weather conditions without altering the deep learning architecture.",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>5.4.2 Programming Style</b>", h1_style))
    story.append(Paragraph(
        "The programming style used in the <b>Digital Twin-Based Wildfire Detection and Prediction System</b> "
        "focuses on keeping the code modular, organized, and straightforward to maintain. The application is cleanly "
        "separated into distinct functional subsystems for frontend UI components, geospatial visualization, satellite "
        "data extraction, U-Net inference, and fire-spread simulation. This modularity ensures that individual components "
        "can be evaluated, updated, or calibrated independently without inducing side effects across the ecosystem.",
        body_style
    ))

    bullets = [
        ("Names", "Meaningful and domain-aligned names are given to files, functions, and components based on their explicit responsibility. For example, <code>UNetDetectionPanel.tsx</code> displays detection-related metrics and confidence masks, while <code>FireSpreadPanel.tsx</code> provides controls for time-stepped fire-spread analysis. <code>unetInferenceService.ts</code> handles model inference communication, while <code>fireSpreadModel.ts</code> houses the directional rate-of-spread mathematics."),
        ("Control Constructs", "Structured conditional constructs evaluate coordinate validity, satellite imagery availability, and ignition combustibility. Iterative loops support repeated numerical execution, such as advancing fire front progression across successive future simulation horizons and calculating radial expansion across 36 directional sectors."),
        ("Information Hiding", "Each module encapsulates its domain logic without exposing unnecessary internal mechanics to other layers. For example, frontend panels present output visualizations without executing matrix tensor transformations or differential spread equations themselves. The inference service abstracts API communication, while the spread model isolates physics calculations."),
        ("User-Defined Types", "TypeScript interfaces and types formalize data structures passed between components and services (e.g., <code>Coordinates</code>, <code>EnvironmentalInfo</code>, <code>DetectionResult</code>, and <code>SpreadResult</code>). This guarantees compile-time type safety, eliminates schema mismatches, and improves codebase reliability."),
        ("Nesting", "Conditional statements and function calls are nested according to strict operational prerequisites. For example, the application verifies whether suitable satellite data exist for a target area before initiating U-Net inference. Similarly, spatial barrier clamping checks are nested within radial sector ray-casting loops.")
    ]

    for title, text in bullets:
        story.append(Paragraph(f"&bull; <b>{title}:</b> {text}", bullet_style))

    # PAGE BREAK -> PAGE 2: Section 5.4.3 & Algorithm 5.1
    story.append(PageBreak())

    story.append(Paragraph("<b>5.4.3 Pseudocodes</b>", h1_style))
    story.append(Paragraph(
        "The following algorithms represent the primary computational workflows implemented in the project, "
        "strictly reflecting the modular separation between retrospective satellite burned-area segmentation "
        "and forward-looking fire-spread simulation.",
        body_style
    ))
    story.append(Spacer(1, 4))

    # Algorithm 5.1 Box
    alg1_header = [
        [Paragraph("<b>Algorithm 5.1: Satellite Data Validation and U-Net Burned-Area Detection</b>", code_title_style)],
        [Paragraph("<b>Input:</b> Target location <code>C_target</code> (Coordinates: lat, lon), Decision threshold &tau; = 0.65<br/>"
                   "<b>Output:</b> Detection result <code>R_detect</code> (DetectionResult: binary mask, burned percentage, vector GeoJSON)", code_io_style)]
    ]
    alg1_code_text = (
"""BEGIN
  1.  // Step 1: Input validation and data availability check (Nesting & Control Constructs)
  2.  IF C_target.latitude is NULL OR C_target.longitude is NULL THEN
  3.    RETURN Error: "Invalid geographical coordinates provided."
  4.  END IF

  5.  satelliteData = unetInferenceService.checkDataAvailability(C_target)
  6.  IF satelliteData.isAvailable == FALSE THEN
  7.    RETURN Error: "No suitable Sentinel-2 multi-spectral imagery found."
  8.  END IF

  9.  // Step 2: 15-channel feature preparation (Information Hiding)
  10. rawBands = unetInferenceService.fetchBands(C_target)    // 12 bands: B01-B09, B11, B12
  11. ndvi = (rawBands.B08 - rawBands.B04) / (rawBands.B08 + rawBands.B04 + 1e-7)
  12. nbr  = (rawBands.B08 - rawBands.B12) / (rawBands.B08 + rawBands.B12 + 1e-7)
  13. ndri = (rawBands.B04 - rawBands.B02) / (rawBands.B04 + rawBands.B02 + 1e-7)
  14. tensor15ch = StackAndNormalize(rawBands, ndvi, nbr, ndri)

  15. // Step 3: U-Net deep learning model inference
  16. probabilityMap = UNetModel.predict(tensor15ch)
  17. countBurned = 0

  18. FOR EACH pixel (x, y) IN probabilityMap:
  19.   IF probabilityMap[x, y] >= τ THEN
  20.     M_bin[x, y] = 1
  21.     countBurned = countBurned + 1
  22.   ELSE
  23.     M_bin[x, y] = 0
  24.   END IF
  25. END FOR

  26. // Step 4: Package results into strongly-typed output
  27. R_detect.burnedPercentage = (countBurned / TotalPixels) * 100.0
  28. R_detect.burnedAreaHa = countBurned * 0.01             // 1 pixel (10m x 10m) = 0.01 ha
  29. R_detect.vectorBoundary = VectorizeMaskToGeoJSON(M_bin)
  30. R_detect.status = "SUCCESS"

  31. RETURN R_detect
END"""
    )
    alg1_table = Table(
        alg1_header + [[Paragraph(alg1_code_text.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_body_style)]],
        colWidths=[487]
    )
    alg1_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor('#334155')),
        ('LINEBELOW', (0,0), (-1,0), 0.8, colors.HexColor('#64748B')),
        ('LINEBELOW', (0,1), (-1,1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(alg1_table)

    # PAGE BREAK -> PAGE 3: Algorithm 5.2 & Section 5.5 Summary
    story.append(PageBreak())

    # Algorithm 5.2 Box
    alg2_header = [
        [Paragraph("<b>Algorithm 5.2: Multi-Time-Step Fire-Spread Simulation and Cesium 3D Visualization</b>", code_title_style)],
        [Paragraph("<b>Input:</b> Ignition point <code>P_ign</code> (Coordinates), Weather <code>E_env</code> (EnvironmentalInfo), Horizons <code>H = [0, 1, 2, 6, 12, 24]</code><br/>"
                   "<b>Output:</b> Simulation result <code>S_spread</code> (SpreadResult: per-time-step radial expansion and 3D terrain layers)", code_io_style)]
    ]
    alg2_code_text = (
"""BEGIN
  1.  // Step 1: Validate ignition point combustibility
  2.  IF fireSpreadModel.isWaterOrNonBurnable(P_ign) == TRUE THEN
  3.    RETURN Error: "Ignition point is located on water or non-combustible surface."
  4.  END IF

  5.  // Step 2: Compute baseline fuel moisture and Rothermel damping factor
  6.  fuelMoisture = fireSpreadModel.computeEMC(E_env.temperature, E_env.humidity)
  7.  dampingEta = fireSpreadModel.computeMoistureDamping(fuelMoisture)
  8.  baseROS = 2.5 * dampingEta                         // Base rate of spread in m/min

  9.  // Step 3: Loop through each simulation horizon (Control Constructs & Loops)
  10. FOR EACH horizon t IN H:
  11.   boundaryPoints = EMPTY_LIST

  12.   // Sub-step: Calculate directional propagation across 36 sectors (Δθ = 10°)
  13.   FOR sectorAngle FROM 0 TO 350 STEP 10:
  14.     phiWind = fireSpreadModel.calculateWindFactor(E_env.windSpeed, E_env.windHeading, sectorAngle)
  15.     phiSlope = fireSpreadModel.calculateSlopeFactor(P_ign, sectorAngle)
  16.     rosSector = baseROS * phiWind * phiSlope
  17.     intendedRadius = rosSector * 60.0 * t          // Expansion distance in meters

  18.     // Barrier checking: Halt spread if water body or road is encountered
  19.     clampedRadius = intendedRadius
  20.     FOR dist FROM 25.0 TO intendedRadius STEP 25.0:
  21.       probePt = ProjectCoordinate(P_ign, dist, sectorAngle)
  22.       IF fireSpreadModel.isWaterOrNonBurnable(probePt) == TRUE THEN
  23.         clampedRadius = dist - 25.0
  24.         BREAK                                      // Clamp fire front at barrier edge
  25.       END IF
  26.     END FOR

  27.     boundaryPoints.APPEND(ProjectCoordinate(P_ign, clampedRadius, sectorAngle))
  28.   END FOR

  29.   // Step 4: Render updated fire perimeter on CesiumJS 3D terrain
  30.   perimeterPolygon = CreatePolygonHierarchy(boundaryPoints)
  31.   CesiumViewer.renderSpreadLayer(perimeterPolygon, clampToGround=TRUE)
  32.   S_spread.timesteps[t] = {perimeter: perimeterPolygon, burnedArea: CalcArea(boundaryPoints)}
  33. END FOR

  34. RETURN S_spread
END"""
    )
    alg2_table = Table(
        alg2_header + [[Paragraph(alg2_code_text.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_body_style)]],
        colWidths=[487]
    )
    alg2_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor('#334155')),
        ('LINEBELOW', (0,0), (-1,0), 0.8, colors.HexColor('#64748B')),
        ('LINEBELOW', (0,1), (-1,1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(alg2_table)
    story.append(Spacer(1, 10))

    # Section 5.5 Summary
    story.append(Paragraph("<b>5.5 Summary</b>", h1_style))
    story.append(Paragraph(
        "The system integrates Sentinel-1 SAR and Sentinel-2 satellite data processing with a trained U-Net model "
        "to identify burned areas and generate detection masks. Environmental and geographical information supports "
        "fire-spread simulation and risk-zone analysis, while CesiumJS provides interactive 3D visualization of terrain, "
        "affected regions, and simulated fire progression. The dashboard presents detection results, environmental conditions, "
        "and wildfire scenarios in a user-friendly interface. The modular architecture, structured coding practices, and "
        "TypeScript support improve readability, maintainability, and flexibility. Overall, the implementation provides an "
        "integrated platform for wildfire monitoring and analysis, although further validation and improved environmental "
        "data integration are needed to enhance the reliability of fire-spread simulations.",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    shutil.copyfile(pdf_path, public_path)
    print("PDF build successful: 3 clean self-contained pages.")

if __name__ == "__main__":
    build_pdf()
