const Order = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');




const generateInvoicePDF = async (order, res) => {
    try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
        doc.pipe(res);

        // Header Section
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('BLUR VINTAGE', 50, 50);
        
        doc.fontSize(10)
           .font('Helvetica')
           .text('Fashion & Lifestyle', 50, 80);

        // Company Details (right aligned)
        const pageWidth = doc.page.width;
        doc.fontSize(10)
           .text('www.blurvintage.com', pageWidth - 180, 50)
           .text('support@blurvintage.com', pageWidth - 180, 65)
           .text('Contact: +91 9876543210', pageWidth - 180, 80);

        // Invoice Title & Border
        doc.rect(50, 100, pageWidth - 100, 50).stroke();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('TAX INVOICE', 0, 120, { align: 'center' });

        // Customer & Invoice Details Section
        let yPos = 170;
        const colWidth = (pageWidth - 100) / 2;

        // Left Column - Invoice Details
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('INVOICE DETAILS:', 50, yPos);
        
        doc.font('Helvetica')
           .text(`Invoice Number: INV-${order.orderNumber}`, 50, yPos + 20)
           .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, yPos + 35)
           .text(`Invoice Date: ${new Date(order.deliveryDate).toLocaleDateString()}`, 50, yPos + 50);

        // Right Column - Billing Details
        doc.font('Helvetica-Bold')
           .text('BILL TO:', pageWidth - colWidth - 50, yPos);
        
        doc.font('Helvetica')
           .text(order.shippingAddress.name, pageWidth - colWidth - 50, yPos + 20)
           .text(order.shippingAddress.landMark, pageWidth - colWidth - 50, yPos + 35)
           .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, pageWidth - colWidth - 50, yPos + 50)
           .text(`${order.shippingAddress.country} - ${order.shippingAddress.pincode}`, pageWidth - colWidth - 50, yPos + 65)
           .text(`Phone: ${order.shippingAddress.phone}`, pageWidth - colWidth - 50, yPos + 80);

        // Items Table
        yPos = 300;
        const tableTop = yPos;
        const tableWidth = pageWidth - 100;
        
        // Table Headers
        const columns = {
            item: { x: 50, width: 40 },
            description: { x: 90, width: 200 },
            quantity: { x: 290, width: 70 },
            price: { x: 360, width: 100 },
            total: { x: 460, width: 90 }
        };

        // Draw table header background
        doc.rect(50, tableTop, tableWidth, 20).fill('#f6f6f6');
        
        // Table Headers
        doc.fillColor('#000000')
           .fontSize(10)
           .font('Helvetica-Bold');
        
        Object.entries(columns).forEach(([key, col]) => {
            const headerText = key.charAt(0).toUpperCase() + key.slice(1);
            doc.text(headerText, col.x, tableTop + 5, { width: col.width, align: 'left' });
        });

        // Table Content
        let currentY = tableTop + 25;
        let itemNumber = 1;

        // Active Items
        order.orderItems.forEach(item => {
            if (!item.status.return?.requested && item.status.itemStatus !== 'Cancelled') {
                const itemTotal = item.price.discountedPrice * item.quantity;
                
                // Alternate row backgrounds
                if (itemNumber % 2 === 0) {
                    doc.rect(50, currentY - 5, tableWidth, 25).fill('#f9f9f9');
                }
                
                doc.fillColor('#000000')
                   .font('Helvetica')
                   .fontSize(9);

                doc.text(itemNumber.toString(), columns.item.x, currentY)
                   .text(`${item.variant.colorName} - ${item.variant.size}`, columns.description.x, currentY)
                   .text(item.quantity.toString(), columns.quantity.x, currentY)
                   .text(`₹${item.price.discountedPrice.toFixed(2)}`, columns.price.x, currentY)
                   .text(`₹${itemTotal.toFixed(2)}`, columns.total.x, currentY);

                currentY += 25;
                itemNumber++;
            }
        });

        // Summary Section
        const summaryStartX = pageWidth - 250;
        const summaryWidth = 200;
        currentY += 20;

        // Summary Box
        doc.rect(summaryStartX, currentY, summaryWidth, 140)
           .stroke();

        let summaryY = currentY + 10;
        
        // Original Subtotal
        doc.font('Helvetica')
           .fontSize(10);

        const addSummaryLine = (label, value, isNegative = false, isBold = false) => {
            if (isBold) doc.font('Helvetica-Bold');
            doc.text(label, summaryStartX + 10, summaryY);
            doc.text(
                `${isNegative ? '-' : ''}₹${value.toFixed(2)}`, 
                summaryStartX + summaryWidth - 70, 
                summaryY,
                { width: 60, align: 'right' }
            );
            if (isBold) doc.font('Helvetica');
            summaryY += 20;
        };

        // Add summary lines
        addSummaryLine('Subtotal:', order.pricing.subtotal);

        // Handle returns if any
        const returnedItems = order.orderItems.filter(item => 
            item.status.return?.requested && item.status.return?.status === 'Approved'
        );

        if (returnedItems.length > 0) {
            const returnSubtotal = returnedItems.reduce((total, item) => 
                total + (item.price.discountedPrice * item.quantity), 0
            );
            addSummaryLine('Returns:', returnSubtotal, true);
            addSummaryLine('Adjusted Subtotal:', order.pricing.subtotal - returnSubtotal);
        }

        // Handle Coupon Discount
        if (order.pricing.coupon && order.pricing.coupon.discount > 0) {
            addSummaryLine('Coupon Discount:', order.pricing.coupon.discount, true);
        }

        // Handle Product Offers
        if (order.pricing.productOffersTotal > 0) {
            addSummaryLine('Product Offers:', order.pricing.productOffersTotal, true);
        }

        // Final Amount (with background)
        doc.rect(summaryStartX, summaryY - 5, summaryWidth, 30)
           .fill('#f6f6f6');
        
        const finalAmount = order.pricing.finalAmount - returnedItems.reduce((total, item) => 
            total + (item.price.discountedPrice * item.quantity), 0
        );
        
        doc.fillColor('#000000');
        addSummaryLine('Final Amount:', finalAmount, false, true);

        // Payment Details
        doc.fontSize(10)
           .text('Payment Information:', 50, currentY)
           .text(`Method: ${order.payment.method}`, 50, currentY + 20)
           .text(`Status: ${order.payment.status}`, 50, currentY + 35);

        // Footer
        doc.fontSize(8)
           .text('This is a computer-generated invoice and does not require a signature.', 0, doc.page.height - 50, {
               align: 'center',
               color: '#666666'
           });

        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ success: false, message: 'Error generating invoice' });
    }
};


const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        
        if (order.orderStatus !== 'Delivered' || 
            (order.payment.method === 'Razorpay' && order.payment.status !== 'Completed') || 
            (order.payment.method === 'COD' && order.payment.status !== 'Completed')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invoice is only available for delivered orders with completed payment' 
            });
        }
        
        await generateInvoicePDF(order, res);
        
    } catch (error) {
        console.error('Error in downloadInvoice:', error);
        res.status(500).json({ success: false, message: 'Error downloading invoice' });
    }
};



module.exports={downloadInvoice}