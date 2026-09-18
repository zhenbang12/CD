"""
Module 3: Predictive F&B Batch Optimization Engine
Diagram Generator for:
1. Use Case Diagram (UC1 to UC6 with Include & Extend relationships)
2. 5-Swimlane Activity Diagram (Kitchen Staff, Head Chef, F&B Engine, Oracle PMS, System Admin)
Author: Zhen Bang (Tech Lead / PIC: Module 3)
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches

def generate_use_case_diagram():
    fig, ax = plt.subplots(figsize=(16, 12), dpi=300)
    ax.set_xlim(0, 160)
    ax.set_ylim(0, 120)
    ax.axis('off')

    # Background system boundary
    sys_box = patches.FancyBboxPatch((35, 8), 90, 104, boxstyle="round,pad=1.5,rounding_size=2",
                                     linewidth=2.5, edgecolor='#059669', facecolor='#F0FDF4', alpha=0.5)
    ax.add_patch(sys_box)
    ax.text(80, 110, 'Module 3: Predictive F&B Batch Optimization Engine',
            ha='center', va='center', fontsize=16, fontweight='bold', color='#065F46')

    # Helper function to draw actors
    def draw_actor(x, y, name, color='#1E293B'):
        # Head
        head = plt.Circle((x, y + 5), 2.2, edgecolor=color, facecolor='white', linewidth=2)
        ax.add_patch(head)
        # Body
        ax.plot([x, x], [y + 2.8, y - 4], color=color, linewidth=2.5)
        # Arms
        ax.plot([x - 3.5, x + 3.5], [y + 0.5, y + 0.5], color=color, linewidth=2.5)
        # Legs
        ax.plot([x, x - 3], [y - 4, y - 10], color=color, linewidth=2.5)
        ax.plot([x, x + 3], [y - 4, y - 10], color=color, linewidth=2.5)
        # Name
        ax.text(x, y - 13.5, name, ha='center', va='top', fontsize=10, fontweight='bold', color=color)

    # Left Actors
    draw_actor(18, 92, 'Kitchen Staff /\nPrep Cook', '#047857')
    draw_actor(18, 55, 'Head Chef /\nSous Chef', '#1D4ED8')
    draw_actor(18, 20, 'System Admin /\nManager', '#9333EA')

    # Right Actor (Secondary System Actor)
    draw_actor(142, 65, 'Oracle SQL PMS\n(Reservation System)', '#C2410C')

    # Helper function to draw use case ellipses
    def draw_uc(x, y, w, h, text, is_core=True):
        ec = '#059669' if is_core else '#64748B'
        fc = '#FFFFFF' if is_core else '#F8FAFC'
        lw = 2 if is_core else 1.2
        ellipse = patches.Ellipse((x, y), w, h, edgecolor=ec, facecolor=fc, linewidth=lw, zorder=3)
        ax.add_patch(ellipse)
        ax.text(x, y, text, ha='center', va='center', fontsize=9, fontweight='bold' if is_core else 'normal',
                color='#0F172A', zorder=4)

    # Core Use Cases
    draw_uc(58, 98, 28, 9, 'UC1: Log Plate Waste\n(End of Shift)')
    draw_uc(60, 72, 32, 10, 'UC2: Calculate Optimized\nBatch Sizes')
    draw_uc(58, 45, 30, 9, 'UC3: View Prep\nRecommendations')
    draw_uc(58, 22, 26, 8, 'UC4: Login to System')
    draw_uc(102, 72, 30, 10, 'UC5: Ingest 48-Hour\nForecast Data')
    draw_uc(100, 32, 28, 9, 'UC6: Refine Predictive\nModel')

    # Sub / Included / Extended Use Cases
    draw_uc(98, 102, 24, 7, 'Select Buffet\nStation/Dish', False)
    draw_uc(100, 91, 25, 7, 'Input Discarded\nWeight (kg)', False)
    draw_uc(65, 107, 24, 6.5, 'Flag as Anomaly\n(Accident Spill)', False)
    draw_uc(94, 110, 22, 6.5, 'Attach Photo\nEvidence', False)

    draw_uc(76, 83, 26, 7, 'Generate Consumption\nBaseline', False)
    draw_uc(78, 60, 26, 7, 'Apply Historical\nWaste Multiplier', False)
    draw_uc(45, 60, 22, 6.5, 'Apply Manual\nChef Override', False)

    draw_uc(85, 48, 24, 6.5, 'Filter by Meal Period\n(Breakfast/Dinner)', False)
    draw_uc(85, 40, 23, 6.5, 'Print Hardcopy\nPrep Sheet', False)
    draw_uc(85, 32, 22, 6.5, 'Export Prep Sheet\nTo PDF', False)

    draw_uc(75, 14, 22, 5.5, 'Reset Password\nProtocol', False)

    draw_uc(122, 90, 23, 6.5, 'Parse Expected\nCheck-ins', False)
    draw_uc(124, 80, 23, 6.5, 'Parse Guest\nNationalities', False)
    draw_uc(122, 70, 23, 6.5, 'Parse Dietary\nProfiles (Halal/Vegan)', False)

    draw_uc(106, 20, 23, 6.5, 'Analyze Dish\nWaste Trends', False)
    draw_uc(118, 42, 23, 6.5, 'Send Over-Prep Alert\nTo Management', False)

    # Actor Connections
    # Kitchen Staff -> UC1, UC3, UC4
    ax.annotate('', xy=(44, 98), xytext=(22, 94), arrowprops=dict(arrowstyle="-", color='#047857', lw=1.5))
    ax.annotate('', xy=(44, 46), xytext=(22, 90), arrowprops=dict(arrowstyle="-", color='#047857', lw=1.2, ls=':'))
    ax.annotate('', xy=(45, 23), xytext=(22, 88), arrowprops=dict(arrowstyle="-", color='#047857', lw=1.2, ls=':'))

    # Head Chef -> UC2, UC3, UC4
    ax.annotate('', xy=(44, 72), xytext=(22, 57), arrowprops=dict(arrowstyle="-", color='#1D4ED8', lw=1.5))
    ax.annotate('', xy=(43, 46), xytext=(22, 55), arrowprops=dict(arrowstyle="-", color='#1D4ED8', lw=1.5))
    ax.annotate('', xy=(45, 23), xytext=(22, 53), arrowprops=dict(arrowstyle="-", color='#1D4ED8', lw=1.2, ls=':'))

    # System Admin -> UC6, UC4
    ax.annotate('', xy=(86, 32), xytext=(22, 21), arrowprops=dict(arrowstyle="-", color='#9333EA', lw=1.5))
    ax.annotate('', xy=(45, 22), xytext=(22, 20), arrowprops=dict(arrowstyle="-", color='#9333EA', lw=1.2, ls=':'))

    # Oracle PMS -> UC2, UC5
    ax.annotate('', xy=(117, 72), xytext=(138, 67), arrowprops=dict(arrowstyle="-", color='#C2410C', lw=1.5))
    ax.annotate('', xy=(76, 72), xytext=(138, 65), arrowprops=dict(arrowstyle="-", color='#C2410C', lw=1.2, ls='--'))

    # Include relationships (Dashed with open arrowhead and «include» label)
    def draw_rel(x1, y1, x2, y2, label, is_include=True):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color='#2563EB' if is_include else '#D97706',
                                   lw=1.2, ls='--', shrinkA=3, shrinkB=3))
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x, mid_y + 1, f"«{'include' if is_include else 'extend'}»",
                ha='center', va='center', fontsize=7, fontweight='bold',
                color='#1D4ED8' if is_include else '#B45309',
                bbox=dict(boxstyle="square,pad=0.1", fc='white', ec='none', alpha=0.85))

    # UC1 includes & extends
    draw_rel(72, 100, 86, 102, 'include', True)
    draw_rel(71, 95, 87, 92, 'include', True)
    draw_rel(63, 102, 65, 104, 'extend', False)
    draw_rel(70, 101, 84, 108, 'extend', False)
    draw_rel(68, 94, 88, 36, 'include', True) # Refine predictive model

    # UC2 includes & extends
    draw_rel(76, 72, 87, 72, 'include', True) # Ingest 48h forecast
    draw_rel(68, 76, 72, 80, 'include', True) # Baseline
    draw_rel(68, 68, 72, 63, 'include', True) # Waste Multiplier
    draw_rel(50, 68, 48, 63, 'extend', False) # Chef override

    # UC3 includes & extends
    draw_rel(58, 40, 58, 26, 'include', True) # Login
    draw_rel(72, 46, 75, 47, 'extend', False)
    draw_rel(72, 44, 75, 41, 'extend', False)
    draw_rel(72, 42, 75, 34, 'extend', False)

    # UC4 extends
    draw_rel(67, 19, 71, 16, 'extend', False)

    # UC5 includes
    draw_rel(115, 76, 118, 87, 'include', True)
    draw_rel(116, 74, 118, 78, 'include', True)
    draw_rel(115, 70, 117, 70, 'include', True)

    # UC6 includes & extends
    draw_rel(102, 27, 104, 23, 'include', True)
    draw_rel(108, 36, 114, 40, 'extend', False)

    plt.tight_layout()
    plt.savefig('d:/CD/m3_use_case_diagram.png', bbox_inches='tight', dpi=300)
    plt.close()
    print('[OK] Generated m3_use_case_diagram.png')

def generate_activity_diagram_5_swimlanes():
    fig, ax = plt.subplots(figsize=(18, 14), dpi=300)
    ax.set_xlim(0, 180)
    ax.set_ylim(0, 140)
    ax.axis('off')

    # Swimlanes setup
    lanes = [
        ('Kitchen Staff / Prep Cook', 0, 36, '#F8FAFC', '#059669'),
        ('Head Chef / Sous Chef', 36, 72, '#F0FDF4', '#1D4ED8'),
        ('F&B Batch Optimization Engine', 72, 108, '#EFF6FF', '#0284C7'),
        ('Oracle SQL Hotel Reservation System', 108, 144, '#FFF7ED', '#C2410C'),
        ('System Admin / Management', 144, 180, '#FAF5FF', '#9333EA')
    ]

    # Draw swimlane headers and columns
    for title, x1, x2, bg, border in lanes:
        # Header box
        hdr = patches.Rectangle((x1, 130), x2 - x1, 10, linewidth=1.5, edgecolor='#94A3B8', facecolor=border)
        ax.add_patch(hdr)
        ax.text((x1 + x2) / 2, 135, title, ha='center', va='center', fontsize=9.5, fontweight='bold', color='white')

        # Column lane
        col = patches.Rectangle((x1, 0), x2 - x1, 130, linewidth=1, edgecolor='#CBD5E1', facecolor=bg, alpha=0.6)
        ax.add_patch(col)

    # Title
    ax.text(90, 138, 'Module 3: 5-Swimlane Activity Diagram — Predictive F&B Batch Optimization Lifecycle',
            ha='center', va='bottom', fontsize=13, fontweight='bold', color='#0F172A')

    # Activity action state helper
    def draw_action(x, y, w, h, text, color='#FFFFFF', ec='#334155'):
        rect = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.5,rounding_size=1.5",
                                      linewidth=1.2, edgecolor=ec, facecolor=color, zorder=4)
        ax.add_patch(rect)
        ax.text(x, y, text, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#0F172A', zorder=5)

    def draw_decision(x, y, size, text=''):
        diamond = patches.RegularPolygon((x, y), 4, radius=size, orientation=0,
                                         edgecolor='#D97706', facecolor='#FEF3C7', linewidth=1.2, zorder=4)
        ax.add_patch(diamond)
        if text:
            ax.text(x, y, text, ha='center', va='center', fontsize=7, fontweight='bold', color='#92400E', zorder=5)

    # Initial state
    start1 = plt.Circle((18, 124), 2, edgecolor='#0F172A', facecolor='#0F172A', zorder=5)
    ax.add_patch(start1)

    # Lane 1: Kitchen Staff
    draw_action(18, 114, 28, 7, 'Select Concluded Meal Period\n& Dish from Buffet Line')
    draw_action(18, 98, 28, 7, 'Input Discarded Weight (kg)\nat End of Shift (UC1)')
    draw_decision(18, 83, 4, 'Valid\nWeight?')
    draw_action(8, 70, 14, 6, 'Show Error Red\nPrompt Re-entry', '#FEE2E2', '#EF4444')
    draw_decision(18, 58, 4, 'Accident\nSpill?')
    draw_action(7, 45, 13, 6, 'Flag Anomaly &\nAttach Photo', '#FEF3C7', '#D97706')
    draw_action(18, 32, 28, 7, 'Submit Plate Waste Record\n[PLATE_WASTE Table]')

    # Lane 4: Oracle PMS
    start2 = plt.Circle((126, 124), 2, edgecolor='#0F172A', facecolor='#0F172A', zorder=5)
    ax.add_patch(start2)
    draw_action(126, 114, 30, 7, 'Compile 48-Hour Influx:\nCheck-ins, Nationalities, Diets')
    draw_decision(126, 98, 4, 'PMS Link\nOnline?')
    draw_action(137, 85, 18, 6, 'Fallback 30-Day Rolling\nBaseline (UC2 A1)', '#FFEDD5', '#EA580C')
    draw_action(126, 72, 30, 7, 'Transmit Booking Data Payload\nto Batch Engine (UC5)')

    # Lane 3: F&B Batch Optimization Engine
    draw_action(90, 106, 30, 7, 'Ingest 48h Matrix &\nParse Demographic Multipliers')
    draw_action(90, 88, 30, 7, 'Calculate Optimized Batch Sizes\nRawKg = (Diners * Base) / Yield')
    draw_action(90, 68, 30, 7, 'Apply Historical Waste Multiplier\nvia Exponential Moving Average')
    draw_action(90, 50, 30, 7, 'Analyze Dish Waste Trends &\nRefine Predictive Baseline Matrix')
    draw_decision(90, 34, 4, 'Spike in\nWaste?')
    draw_action(90, 18, 28, 6.5, 'Persist Final Batches to\nPREP_RECOMMENDATIONS', '#DCFCE7', '#15803D')

    # Lane 2: Head Chef
    draw_action(54, 76, 28, 7, 'Review Station Recommendations\n& 3-Wave Staged Targets (UC3)')
    draw_decision(54, 60, 4, 'Chef\nOverride?')
    draw_action(41, 48, 14, 6, 'Adjust Multiplier\n0.50x - 1.20x', '#DBEAFE', '#2563EB')
    draw_action(54, 34, 28, 7, 'Finalize Batch Prep Sheet\n(Breakfast / Lunch / Dinner)')
    draw_action(54, 18, 28, 7, 'Export to PDF &\nPrint Hardcopy Sheet (QR Token)')

    # Lane 5: System Admin / Management
    draw_action(162, 50, 28, 7, 'Review Algorithm Maintenance\n& Model Refinement Logs (UC6)')
    draw_action(162, 34, 28, 7, 'Receive Instant Over-Prep Alert\nvia Email & Push Notification', '#FEE2E2', '#DC2626')
    draw_action(162, 18, 28, 7, 'Audit Operational Compliance &\nVM2026 Sustainable Benchmarks')

    # Final End States
    end1 = plt.Circle((54, 6), 2, edgecolor='#0F172A', facecolor='white', zorder=5)
    end1_inner = plt.Circle((54, 6), 1.2, edgecolor='#0F172A', facecolor='#0F172A', zorder=6)
    ax.add_patch(end1)
    ax.add_patch(end1_inner)

    end2 = plt.Circle((162, 6), 2, edgecolor='#0F172A', facecolor='white', zorder=5)
    end2_inner = plt.Circle((162, 6), 1.2, edgecolor='#0F172A', facecolor='#0F172A', zorder=6)
    ax.add_patch(end2)
    ax.add_patch(end2_inner)

    # Connectors with arrows
    def connect(p1, p2, text='', color='#334155'):
        ax.annotate('', xy=p2, xytext=p1,
                    arrowprops=dict(arrowstyle="->", color=color, lw=1.2, shrinkA=2, shrinkB=2))
        if text:
            mid = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
            ax.text(mid[0] + 1.5, mid[1], text, fontsize=6.5, fontweight='bold', color=color)

    # Kitchen flow
    connect((18, 122), (18, 117.5))
    connect((18, 110.5), (18, 101.5))
    connect((18, 94.5), (18, 87))
    connect((14, 83), (8, 73), '[Weight <= 0]')
    connect((8, 67), (14, 98), 'Re-enter')
    connect((18, 79), (18, 62), '[Valid]')
    connect((14, 58), (7, 48), '[Yes]')
    connect((7, 42), (14, 34))
    connect((18, 54), (18, 35.5), '[Regular Leftover]')
    connect((32, 32), (75, 50), 'Plate Waste Logged')

    # PMS flow
    connect((126, 122), (126, 117.5))
    connect((126, 110.5), (126, 102))
    connect((130, 98), (137, 88), '[Offline]')
    connect((137, 82), (126, 75.5))
    connect((126, 94), (126, 75.5), '[Online]')
    connect((111, 72), (105, 88), 'Booking Payload')

    # Batch Engine flow
    connect((90, 102.5), (90, 91.5))
    connect((90, 84.5), (90, 71.5))
    connect((90, 64.5), (90, 53.5))
    connect((90, 46.5), (90, 38))
    connect((104, 34), (148, 34), '[Waste >= 3.8kg Spike]', '#DC2626')
    connect((90, 30), (90, 21.5), '[Normal]')
    connect((75, 88), (68, 78), 'Dispatch Prep Target')

    # Chef flow
    connect((54, 72.5), (54, 64))
    connect((50, 60), (41, 51), '[Yes]')
    connect((41, 45), (50, 36))
    connect((54, 56), (54, 37.5), '[No]')
    connect((54, 30.5), (54, 21.5))
    connect((54, 14.5), (54, 8))
    connect((68, 34), (76, 18), 'Finalized')

    # Management flow
    connect((162, 46.5), (162, 37.5))
    connect((162, 30.5), (162, 21.5))
    connect((162, 14.5), (162, 8))

    plt.tight_layout()
    plt.savefig('d:/CD/m3_activity_diagram_5_swimlanes.png', bbox_inches='tight', dpi=300)
    plt.close()
    print('[OK] Generated m3_activity_diagram_5_swimlanes.png')

if __name__ == '__main__':
    generate_use_case_diagram()
    generate_activity_diagram_5_swimlanes()
    print('\n[SUCCESS] Both Module 3 Diagrams generated with 100% compliance successfully!')
