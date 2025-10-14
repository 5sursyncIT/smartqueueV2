"""
Générateur de factures PDF.
"""

from datetime import datetime
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import Invoice, Payment


class InvoicePDFGenerator:
    """Génère des factures PDF professionnelles."""

    def __init__(self, invoice: Invoice):
        self.invoice = invoice
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Configure les styles personnalisés."""
        # Style pour le titre
        self.title_style = ParagraphStyle(
            "CustomTitle",
            parent=self.styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#1e3a8a"),
            spaceAfter=30,
        )

        # Style pour les sections
        self.heading_style = ParagraphStyle(
            "CustomHeading",
            parent=self.styles["Heading2"],
            fontSize=14,
            textColor=colors.HexColor("#374151"),
            spaceAfter=12,
        )

        # Style pour le texte normal
        self.normal_style = ParagraphStyle(
            "CustomNormal",
            parent=self.styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#4b5563"),
        )

    def generate(self) -> BytesIO:
        """Génère le PDF et retourne un buffer."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        # Construction du contenu
        story = []

        # En-tête
        story.extend(self._build_header())
        story.append(Spacer(1, 0.5 * cm))

        # Informations client
        story.extend(self._build_client_info())
        story.append(Spacer(1, 0.5 * cm))

        # Détails de la facture
        story.extend(self._build_invoice_details())
        story.append(Spacer(1, 0.5 * cm))

        # Tableau des éléments
        story.extend(self._build_items_table())
        story.append(Spacer(1, 0.5 * cm))

        # Totaux
        story.extend(self._build_totals())
        story.append(Spacer(1, 1 * cm))

        # Informations de paiement
        if self.invoice.payment:
            story.extend(self._build_payment_info())
            story.append(Spacer(1, 0.5 * cm))

        # Pied de page
        story.extend(self._build_footer())

        # Génération du PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def _build_header(self):
        """Construit l'en-tête de la facture."""
        elements = []

        # Logo et nom de l'entreprise (côté gauche)
        company_data = [
            [Paragraph("<b>SmartQueue</b>", self.title_style)],
            [Paragraph("Gestion de Files d'Attente", self.normal_style)],
            [Paragraph("Dakar, Sénégal", self.normal_style)],
            [Paragraph("contact@smartqueue.sn", self.normal_style)],
            [Paragraph("Tél: +221 33 XXX XX XX", self.normal_style)],
        ]

        # Informations de facturation (côté droit)
        invoice_data = [
            [
                Paragraph(
                    f"<b>FACTURE N° {self.invoice.invoice_number}</b>", self.heading_style
                )
            ],
            [
                Paragraph(
                    f"Date: {self.invoice.issue_date.strftime('%d/%m/%Y')}",
                    self.normal_style,
                )
            ],
            [
                Paragraph(
                    f"Échéance: {self.invoice.due_date.strftime('%d/%m/%Y')}",
                    self.normal_style,
                )
            ],
        ]

        if self.invoice.status == "paid":
            invoice_data.append(
                [
                    Paragraph(
                        '<font color="green"><b>PAYÉE</b></font>', self.normal_style
                    )
                ]
            )
        elif self.invoice.status == "overdue":
            invoice_data.append(
                [
                    Paragraph(
                        '<font color="red"><b>EN RETARD</b></font>', self.normal_style
                    )
                ]
            )

        # Table d'en-tête avec deux colonnes
        header_table = Table(
            [[company_data, invoice_data]], colWidths=[9 * cm, 8 * cm]
        )

        header_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ]
            )
        )

        elements.append(header_table)
        elements.append(Spacer(1, 1 * cm))

        return elements

    def _build_client_info(self):
        """Construit les informations du client."""
        elements = []

        elements.append(Paragraph("<b>FACTURÉ À:</b>", self.heading_style))

        client_info = [
            f"<b>{self.invoice.tenant.name}</b>",
            f"Organisation: {self.invoice.tenant.company_name or self.invoice.tenant.name}",
            f"Email: {self.invoice.tenant.email}",
        ]

        if self.invoice.tenant.phone:
            client_info.append(f"Téléphone: {self.invoice.tenant.phone}")

        for line in client_info:
            elements.append(Paragraph(line, self.normal_style))

        return elements

    def _build_invoice_details(self):
        """Construit les détails de la facture."""
        elements = []

        if self.invoice.subscription:
            sub = self.invoice.subscription
            plan_name = sub.plan.name if hasattr(sub, 'plan') else "Plan Standard"
            period = "mensuel" if sub.billing_period == "monthly" else "annuel"

            elements.append(
                Paragraph(f"<b>Abonnement {plan_name} - Cycle {period}</b>", self.heading_style)
            )
            elements.append(
                Paragraph(
                    f"Période: du {sub.current_period_start.strftime('%d/%m/%Y')} "
                    f"au {sub.current_period_end.strftime('%d/%m/%Y')}",
                    self.normal_style,
                )
            )

        return elements

    def _build_items_table(self):
        """Construit le tableau des éléments de la facture."""
        elements = []

        # En-tête du tableau
        data = [
            [
                Paragraph("<b>Description</b>", self.normal_style),
                Paragraph("<b>Quantité</b>", self.normal_style),
                Paragraph("<b>Prix Unitaire</b>", self.normal_style),
                Paragraph("<b>Total</b>", self.normal_style),
            ]
        ]

        # Ligne principale (abonnement)
        description = f"Abonnement SmartQueue"
        if self.invoice.subscription:
            sub = self.invoice.subscription
            if hasattr(sub, 'plan'):
                description += f" - {sub.plan.name}"

        data.append(
            [
                Paragraph(description, self.normal_style),
                "1",
                self._format_amount(self.invoice.subtotal),
                self._format_amount(self.invoice.subtotal),
            ]
        )

        # Création du tableau
        table = Table(data, colWidths=[8 * cm, 2 * cm, 3 * cm, 3 * cm])

        table.setStyle(
            TableStyle(
                [
                    # En-tête
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                    ("ALIGN", (0, 0), (-1, 0), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    # Corps
                    ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#4b5563")),
                    ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                    ("ALIGN", (3, 1), (3, -1), "RIGHT"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 10),
                    ("TOPPADDING", (0, 1), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
                    # Bordures
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ]
            )
        )

        elements.append(table)

        return elements

    def _build_totals(self):
        """Construit la section des totaux."""
        elements = []

        totals_data = [
            ["Sous-total:", self._format_amount(self.invoice.subtotal)],
        ]

        if self.invoice.tax_amount > 0:
            totals_data.append(
                ["TVA:", self._format_amount(self.invoice.tax_amount)]
            )

        totals_data.append(
            [
                Paragraph("<b>TOTAL À PAYER:</b>", self.normal_style),
                Paragraph(
                    f"<b>{self._format_amount(self.invoice.total)}</b>", self.normal_style
                ),
            ]
        )

        totals_table = Table(totals_data, colWidths=[12 * cm, 4 * cm])

        totals_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("LINEABOVE", (0, -1), (-1, -1), 2, colors.HexColor("#1e3a8a")),
                    ("TEXTCOLOR", (0, -1), (-1, -1), colors.HexColor("#1e3a8a")),
                ]
            )
        )

        elements.append(totals_table)

        return elements

    def _build_payment_info(self):
        """Construit les informations de paiement."""
        elements = []

        payment = self.invoice.payment
        elements.append(Paragraph("<b>INFORMATIONS DE PAIEMENT</b>", self.heading_style))

        payment_info = [
            f"Méthode: {payment.get_payment_method_display()}",
            f"ID Transaction: {payment.transaction_id}",
            f"Date: {payment.created_at.strftime('%d/%m/%Y à %H:%M')}",
        ]

        if payment.status == "succeeded":
            payment_info.append('<font color="green"><b>Statut: PAYÉ</b></font>')
        else:
            payment_info.append(f"Statut: {payment.get_status_display()}")

        for line in payment_info:
            elements.append(Paragraph(line, self.normal_style))

        return elements

    def _build_footer(self):
        """Construit le pied de page."""
        elements = []

        elements.append(Spacer(1, 1 * cm))

        footer_text = [
            "<b>Conditions de paiement:</b>",
            "Paiement sous 30 jours. En cas de retard, des frais de retard pourront être appliqués.",
            "",
            "<b>Merci pour votre confiance!</b>",
            "Pour toute question concernant cette facture, contactez-nous à facturation@smartqueue.sn",
        ]

        for line in footer_text:
            style = self.heading_style if line.startswith("<b>") else self.normal_style
            elements.append(Paragraph(line, style))

        return elements

    def _format_amount(self, amount: float) -> str:
        """Formate un montant en devise."""
        return f"{amount:,.0f} {self.invoice.currency}".replace(",", " ")


def generate_invoice_pdf(invoice: Invoice) -> BytesIO:
    """
    Fonction utilitaire pour générer un PDF de facture.

    Args:
        invoice: Instance de la facture à générer

    Returns:
        BytesIO: Buffer contenant le PDF généré
    """
    generator = InvoicePDFGenerator(invoice)
    return generator.generate()
