/* Dashboard: reports.
   Keys are unchanged — this file only groups them by module.
   Merged back into one resource by locales/index.ts. */
export default {
  "reports": {
    "insights_hub": "உள்ளுணர்வு மையம்",
    "title": "அறிக்கைகள் & பகுப்பாய்வு",
    "subtitle": "வாகன செயல்திறன் மற்றும் செயல்பாட்டு அறிக்கைகள்",
    "range_today": "இன்று",
    "range_week": "இந்த வாரம்",
    "range_month": "இந்த மாதம்",
    "range_quarter": "இந்த காலாண்டு",
    "kpis": {
      "total_attendance": "மொத்த வருகை",
      "total_attendance_subtext": "கடந்த வாரத்தை விட +2.4%",
      "fuel_efficiency": "எரிபொருள் திறன்",
      "fuel_efficiency_subtext": "+5.1% மேம்பாடு",
      "waste_collected": "சேகரிக்கப்பட்ட கழிவு",
      "waste_collected_subtext": "இந்த மாதம்"
    },
    "attendance_report_title": "வருகை அறிக்கை",
    "attendance_report_subtitle": "பணியாளர் வருகை மற்றும் நேரத்துக்கு வருதல் பகுப்பாய்வு",
    "attendance_on_time": "நேரத்திற்கு வந்தவர்கள்",
    "attendance_late": "தாமதமான வருகை (30 நிமிடத்திற்குள்)",
    "attendance_absent": "வருகையில்லை / வரவில்லை",
    "attendance_export": "வருகை அறிக்கையை ஏற்று",
    "fuel_trends_title": "எரிபொருள் திறன் போக்குகள்",
    "fuel_trends_subtitle": "வாகன வாரியாக எரிபொருள் பயன்பாட்டு பகுப்பாய்வு",
    "fuel_status_excellent": "அருமை",
    "fuel_status_good": "நன்று",
    "fuel_status_average": "சராசரி",
    "fuel_status_needs_attention": "கவனம் தேவை",
    "waste_report_title": "கழிவு சேகரிப்பு அறிக்கை",
    "waste_report_subtitle": "தினசரி மற்றும் மாதாந்திர கழிவு சேகரிப்பு விவரம்",
    "waste_report_daily": "தினசரி",
    "waste_report_monthly": "மாதாந்திரம்",
    "waste_report_total_weight": "மொத்த எடை",
    "waste_report_total_trips": "மொத்த பயணங்கள்",
    "waste_report_points_covered": "உள்ளடக்கப்பட்ட புள்ளிகள்",
    "waste_report_loading": "கழிவு அறிக்கை ஏற்றப்படுகிறது...",
    "waste_report_empty": "கழிவு சேகரிப்பு தரவு இல்லை.",
    "waste_report_export_daily": "தினசரி கழிவு அறிக்கையை ஏற்றுமதி செய்",
    "waste_report_export_monthly": "மாதாந்திர கழிவு அறிக்கையை ஏற்றுமதி செய்",
    "daily_summary": {
      "title": "தினசரி கழிவு சேகரிப்பு சுருக்கம்",
      "subtitle": "கழிவு சேகரிப்பு புள்ளிவிவரங்கள் மற்றும் செயல்திறன் அளவீடுகள்",
      "cards": {
        "total_routes": {
          "label": "மொத்த பாதைகள் முடிக்கப்பட்டது",
          "value": "142",
          "note": "கடந்த வாரத்தை விட +12%"
        },
        "avg_load": {
          "label": "ஒவ்வொரு பயணத்திற்கான சராசரி சுமை",
          "value": "2.8 டன்",
          "note": "சிறந்த வரம்பிற்குள்"
        },
        "efficiency": {
          "label": "சேகரிப்பு திறன்",
          "value": "94.2%",
          "note": "+3.1% மேம்பாடு"
        }
      },
      "export_excel": "Excel-ஆக ஏற்று",
      "export_pdf": "PDF-ஆக ஏற்று"
    }
  }
} as const;
