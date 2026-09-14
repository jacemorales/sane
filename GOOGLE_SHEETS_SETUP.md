# UDDIE'S CLOSET - Google Sheets & Google Apps Script Setup Guide

This guide provides step-by-step instructions to configure **Google Sheets** as the database layer and **Google Apps Script** as the backend API for **UDDIE'S CLOSET**.

---

## 1. Google Sheets Setup

### A. Create or Open the Google Sheet
1. Open [Google Sheets](https://sheets.google.com).
2. Create a new spreadsheet or open the existing spreadsheet (Spreadsheet ID: `15Y7NgfXkQKXll-g9pOXGwKHPg1_Duu6wDehBCxThRWM`).
3. Title the spreadsheet: **UDDIE'S CLOSET Database**.

### B. Create Required Sheet Tabs
Create 3 tabs (sheets) at the bottom of your Google Sheet with the exact names below:

1. `PRODUCTS`
2. `ORDERS`
3. `FINANCIAL RECORDS`

---

## 2. Tab Schema & Column Headers

### Tab 1: `PRODUCTS`
Set Row 1 (Header row) with the following exact column names:

| Column | Header Name | Description |
|---|---|---|
| A | `Product ID` | Unique ID (e.g. `PROD-101`) |
| B | `Name` | Product Name |
| C | `Category` | Category (Shirts, Trousers, Hoodies, Shoes, Bags, etc.) |
| D | `Subcategory` | Subcategory (e.g. Graphic Tees, Cargo) |
| E | `Description` | Product description text |
| F | `Price` | Regular Price in Naira |
| G | `Discount Price` | Discount / Sale price |
| H | `Stock` | Available inventory quantity |
| I | `Sizes` | Comma-separated sizes (e.g. `XS, S, M, L, XL` or `40, 41, 42`) |
| J | `Colors` | Comma-separated colors (e.g. `Black, White`) |
| K | `Brand` | Brand name (`UDDIE'S CLOSET`) |
| L | `Gender` | Gender (`Unisex`, `Men`, `Women`) |
| M | `Material` | Fabric / Material description |
| N | `Images` | Comma-separated image URLs |
| O | `Featured` | `TRUE` or `FALSE` |
| P | `Status` | Status (`Active`, `Out of Stock`, `Draft`) |
| Q | `Tags` | Comma-separated tags |
| R | `Date Added` | Creation timestamp |
| S | `Last Updated` | Modification timestamp |

---

### Tab 2: `ORDERS`
Set Row 1 with the following headers:

| Column | Header Name | Description |
|---|---|---|
| A | `Order ID` | Unique Order ID (e.g. `UDD-1715000000000-123`) |
| B | `Customer Name` | Customer's full name |
| C | `Customer Email` | Customer's email address |
| D | `Customer Phone` | Customer's contact phone number |
| E | `Purchased Products` | Summary list of items ordered with quantities |
| F | `Total Amount` | Total payable amount in Naira |
| G | `Delivery Type` | `Pickup`, `Waybill`, or `Dispatch Rider` |
| H | `Delivery Destination` | Pickup location or customer delivery address |
| I | `Payment Reference` | Paystack transaction reference |
| J | `Payment Status` | `Paid` |
| K | `Order Status` | `Confirmed` / `Processing` |
| L | `Timestamp` | Order creation date/time |

---

### Tab 3: `FINANCIAL RECORDS`
Set Row 1 with the following headers:

| Column | Header Name | Description |
|---|---|---|
| A | `Transaction ID` | Paystack / System Transaction ID |
| B | `Order ID` | Linked Order ID |
| C | `Payment Reference` | Paystack reference string |
| D | `Amount` | Revenue amount in Naira |
| E | `Currency` | `NGN` |
| F | `Payment Status` | `Successful` |
| G | `Customer Reference` | Customer Name and Email reference |
| H | `Date/Time` | Timestamp of successful payment |

> ⚠️ **IMPORTANT**: Only **successful**, confirmed Paystack payments are logged in the `FINANCIAL RECORDS` tab. Failed or cancelled payment attempts are never recorded as financial revenue.

---

## 3. Google Apps Script Setup & Deployment

1. Inside your Google Sheet, click **Extensions > Apps Script** from the top menu.
2. Delete any default code in `Code.gs`.
3. Copy the entire code from `google-apps-script.gs` in this project repository and paste it into the editor.
4. (Optional) Verify that `var SPREADSHEET_ID = "15Y7NgfXkQKXll-g9pOXGwKHPg1_Duu6wDehBCxThRWM";` matches your spreadsheet ID (found in your sheet URL between `/d/` and `/edit`).
5. Click **Save** (💾 icon).

### Deploying as a Web App:
1. Click **Deploy > New deployment** (top right).
2. Select type: **Web app** (click gear icon next to "Select type").
3. Fill in deployment settings:
   - **Description**: `UDDIE'S CLOSET API v1`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. Grant permissions when prompted (Click *Authorize access* -> Select your Google Account -> Click *Advanced* -> Click *Go to UDDIE'S CLOSET Script (unsafe)* -> Click *Allow*).
6. Copy the generated **Web App URL** (starts with `https://script.google.com/macros/s/.../exec`).

---

## 4. Environment Variables Setup (`env.js`)

1. Open `env.js` in your project folder.
2. Update the configuration object with your **Paystack Public Key** and your **Google Apps Script Web App URL**:

```javascript
window.CONFIG = {
    // Paystack Public Key from Paystack Dashboard > Settings > API Keys
    PAYSTACK_PUBLIC_KEY: "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",

    // Web App URL from Google Apps Script deployment
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec"
};
```

---

## 5. How End-to-End System Integration Works

```
PRODUCTS IN GOOGLE SHEETS
         ↓
    USER STORE
         ↓
       CART
         ↓
     CHECKOUT
         ↓
   DELIVERY TYPE (Pickup / Waybill / Dispatch Rider)
         ↓
     PAYSTACK
         ↓
PAYMENT VERIFICATION
         ↓
    ORDER RECORD (Saved to ORDERS Sheet & Email sent)
         ↓
SUCCESSFUL FINANCIAL RECORD (Saved to FINANCIAL RECORDS Sheet)
         ↓
ADMIN PAYMENTS/FINANCE DASHBOARD
```

- **Admin CRUD Operations**: Product additions, edits, and deletions performed in the Admin Dashboard instantly update local state and sync directly with the `PRODUCTS` Google Sheet via the Apps Script Web App.
- **Paystack Payment Verification**: Payment status is verified directly through Paystack callbacks before orders or financial records are stored.
- **Email Confirmations**: Once a payment is confirmed successful, Apps Script sends an order confirmation email to the customer containing strictly the ordered goods, quantities, delivery type, and destination address.
