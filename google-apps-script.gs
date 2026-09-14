/**
 * ============================================================================
 * UDDIE'S CLOSET - Google Apps Script Backend API & Spreadsheet Storage
 * ============================================================================
 *
 * SPREADSHEET TABS REQUIRED:
 * 1. "PRODUCTS"
 * 2. "ORDERS"
 * 3. "FINANCIAL RECORDS"
 */

// Spreadsheet ID (Memory: 15Y7NgfXkQKXll-g9pOXGwKHPg1_Duu6wDehBCxThRWM)
var SPREADSHEET_ID = "15Y7NgfXkQKXll-g9pOXGwKHPg1_Duu6wDehBCxThRWM";

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      console.warn("Could not open by ID, using Active Spreadsheet: " + e.message);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getProducts';
  var ss = getSpreadsheet();

  if (action === 'getProducts') {
    return jsonResponse({ status: 'success', products: fetchProducts(ss) });
  } else if (action === 'getFinances') {
    return jsonResponse({ status: 'success', finances: fetchFinances(ss) });
  } else if (action === 'getOrders') {
    return jsonResponse({ status: 'success', orders: fetchOrders(ss) });
  }

  return jsonResponse({ status: 'error', message: 'Invalid GET action' });
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var ss = getSpreadsheet();

    if (action === 'createProduct') {
      var prod = createProduct(ss, contents.product);
      return jsonResponse({ status: 'success', message: 'Product created', product: prod });
    } else if (action === 'updateProduct') {
      var updated = updateProduct(ss, contents.product);
      return jsonResponse({ status: 'success', message: 'Product updated', product: updated });
    } else if (action === 'deleteProduct') {
      var deleted = deleteProduct(ss, contents.productId);
      return jsonResponse({ status: 'success', message: 'Product deleted', productId: contents.productId });
    } else if (action === 'createOrderAndPayment') {
      saveOrderAndPayment(ss, contents.order, contents.financialRecord);

      // Send Order Confirmation Email
      if (contents.order && contents.order.customerEmail) {
        sendOrderConfirmationEmail(contents.order);
      }
      return jsonResponse({ status: 'success', message: 'Order and Payment logged successfully' });
    }

    return jsonResponse({ status: 'error', message: 'Invalid POST action' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Helper JSON Response Builder with CORS support
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------------------
// PRODUCTS SHEET OPERATIONS
// ----------------------------------------------------------------------------
function fetchProducts(ss) {
  var sheet = ss.getSheetByName("PRODUCTS");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Header only

  var headers = data[0];
  var products = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // Skip empty rows

    products.push({
      id: String(row[0]),
      name: String(row[1]),
      category: String(row[2]),
      subcategory: String(row[3]),
      description: String(row[4]),
      price: Number(row[5]) || 0,
      discountPrice: row[6] ? Number(row[6]) : null,
      stock: Number(row[7]) || 0,
      sizes: row[8] ? String(row[8]).split(',').map(function(s){ return s.trim(); }) : [],
      colors: row[9] ? String(row[9]).split(',').map(function(c){ return c.trim(); }) : [],
      brand: String(row[10]),
      gender: String(row[11]),
      material: String(row[12]),
      images: row[13] ? String(row[13]).split(',').map(function(img){ return img.trim(); }) : [],
      featured: String(row[14]).toLowerCase() === 'true',
      status: String(row[15]),
      tags: String(row[16]),
      dateAdded: String(row[17]),
      lastUpdated: String(row[18])
    });
  }
  return products;
}

function createProduct(ss, product) {
  var sheet = ss.getSheetByName("PRODUCTS");
  if (!sheet) {
    sheet = ss.insertSheet("PRODUCTS");
    sheet.appendRow([
      "Product ID", "Name", "Category", "Subcategory", "Description",
      "Price", "Discount Price", "Stock", "Sizes", "Colors",
      "Brand", "Gender", "Material", "Images", "Featured",
      "Status", "Tags", "Date Added", "Last Updated"
    ]);
  }

  var sizesStr = Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || '');
  var colorsStr = Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || '');
  var imagesStr = Array.isArray(product.images) ? product.images.join(', ') : (product.images || '');

  sheet.appendRow([
    product.id,
    product.name,
    product.category,
    product.subcategory || '',
    product.description || '',
    product.price,
    product.discountPrice || '',
    product.stock,
    sizesStr,
    colorsStr,
    product.brand || "UDDIE'S CLOSET",
    product.gender || 'Unisex',
    product.material || '',
    imagesStr,
    Boolean(product.featured),
    product.status || 'Active',
    product.tags || '',
    product.dateAdded || new Date().toISOString().split('T')[0],
    product.lastUpdated || new Date().toISOString().split('T')[0]
  ]);

  return product;
}

function updateProduct(ss, product) {
  var sheet = ss.getSheetByName("PRODUCTS");
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var sizesStr = Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || '');
  var colorsStr = Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || '');
  var imagesStr = Array.isArray(product.images) ? product.images.join(', ') : (product.images || '');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(product.id)) {
      var rowIdx = i + 1; // 1-indexed in Apps Script
      sheet.getRange(rowIdx, 1, 1, 19).setValues([[
        product.id,
        product.name,
        product.category,
        product.subcategory || '',
        product.description || '',
        product.price,
        product.discountPrice || '',
        product.stock,
        sizesStr,
        colorsStr,
        product.brand || "UDDIE'S CLOSET",
        product.gender || 'Unisex',
        product.material || '',
        imagesStr,
        Boolean(product.featured),
        product.status || 'Active',
        product.tags || '',
        data[i][17] || new Date().toISOString().split('T')[0], // keep original dateAdded
        new Date().toISOString().split('T')[0]
      ]]);
      return product;
    }
  }
  return null;
}

function deleteProduct(ss, productId) {
  var sheet = ss.getSheetByName("PRODUCTS");
  if (!sheet) return false;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(productId)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------------
// ORDERS & FINANCIAL RECORDS OPERATIONS
// ----------------------------------------------------------------------------
function saveOrderAndPayment(ss, order, financialRecord) {
  // 1. ORDERS SHEET
  var ordersSheet = ss.getSheetByName("ORDERS");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("ORDERS");
    ordersSheet.appendRow([
      "Order ID", "Customer Name", "Customer Email", "Customer Phone",
      "Purchased Products", "Total Amount", "Delivery Type", "Delivery Destination",
      "Payment Reference", "Payment Status", "Order Status", "Timestamp"
    ]);
  }

  var itemsSummary = Array.isArray(order.items) ? order.items.join('; ') : String(order.items || '');

  ordersSheet.appendRow([
    order.orderId,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    itemsSummary,
    order.totalAmount,
    order.deliveryType,
    order.deliveryDestination,
    order.paymentRef,
    order.paymentStatus || 'Paid',
    order.orderStatus || 'Confirmed',
    order.timestamp || new Date().toISOString()
  ]);

  // 2. FINANCIAL RECORDS SHEET (ONLY Confirmed Successful Transactions)
  if (financialRecord && financialRecord.paymentStatus === 'Successful') {
    var finSheet = ss.getSheetByName("FINANCIAL RECORDS");
    if (!finSheet) {
      finSheet = ss.insertSheet("FINANCIAL RECORDS");
      finSheet.appendRow([
        "Transaction ID", "Order ID", "Payment Reference", "Amount",
        "Currency", "Payment Status", "Customer Reference", "Date/Time"
      ]);
    }

    finSheet.appendRow([
      financialRecord.transactionId,
      financialRecord.orderId,
      financialRecord.paymentRef,
      financialRecord.amount,
      financialRecord.currency || 'NGN',
      financialRecord.paymentStatus,
      financialRecord.customerRef,
      financialRecord.dateTime || new Date().toLocaleString()
    ]);
  }
}

function fetchFinances(ss) {
  var sheet = ss.getSheetByName("FINANCIAL RECORDS");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var records = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    records.push({
      transactionId: String(r[0]),
      orderId: String(r[1]),
      paymentRef: String(r[2]),
      amount: Number(r[3]) || 0,
      currency: String(r[4]),
      paymentStatus: String(r[5]),
      customerRef: String(r[6]),
      dateTime: String(r[7])
    });
  }
  return records;
}

function fetchOrders(ss) {
  var sheet = ss.getSheetByName("ORDERS");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var orders = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    orders.push({
      orderId: String(r[0]),
      customerName: String(r[1]),
      customerEmail: String(r[2]),
      customerPhone: String(r[3]),
      items: String(r[4]),
      totalAmount: Number(r[5]) || 0,
      deliveryType: String(r[6]),
      deliveryDestination: String(r[7]),
      paymentRef: String(r[8]),
      paymentStatus: String(r[9]),
      orderStatus: String(r[10]),
      timestamp: String(r[11])
    });
  }
  return orders;
}

// ----------------------------------------------------------------------------
// EMAIL CONFIRMATION TEMPLATE (Requirement 9)
// ----------------------------------------------------------------------------
function sendOrderConfirmationEmail(order) {
  try {
    var subject = "UDDIE'S CLOSET - Order Confirmation #" + order.orderId;

    var itemsList = Array.isArray(order.items) ? order.items.join('\n - ') : order.items;

    var body = "Hello " + order.customerName + ",\n\n" +
      "Thank you for your order with UDDIE'S CLOSET!\n\n" +
      "--- ORDER DETAILS ---\n" +
      "Order ID: " + order.orderId + "\n" +
      "Payment Reference: " + order.paymentRef + "\n\n" +
      "--- PURCHASED GOODS ---\n" +
      " - " + itemsList + "\n\n" +
      "Total Amount Paid: ₦" + Number(order.totalAmount).toLocaleString() + "\n\n" +
      "--- DELIVERY INFORMATION ---\n" +
      "Delivery Type: " + order.deliveryType + "\n" +
      "Delivery Destination: " + order.deliveryDestination + "\n\n" +
      "We are processing your order and will contact you shortly.\n\n" +
      "Warm regards,\n" +
      "UDDIE'S CLOSET Team\n" +
      "Phone / WhatsApp: +234 802 137 5140";

    MailApp.sendEmail(order.customerEmail, subject, body);
  } catch (e) {
    console.warn("Could not send confirmation email: " + e.message);
  }
}
