'use client';

import { useEffect, useState } from 'react';

export default function PaginationTestPage() {
  const [booksData, setBooksData] = useState<any>(null);
  const [ordersData, setOrdersData] = useState<any>(null);
  const [expensesData, setExpensesData] = useState<any>(null);

  useEffect(() => {
    // Test Books API
    fetch('/api/books?page=1&limit=5')
      .then(res => res.json())
      .then(data => {
        console.log('Books API Response:', data);
        setBooksData(data);
      });

    // Test Orders API
    fetch('/api/orders?page=1&limit=5')
      .then(res => res.json())
      .then(data => {
        console.log('Orders API Response:', data);
        setOrdersData(data);
      });

    // Test Expenses API
    fetch('/api/expenses?page=1&limit=5')
      .then(res => res.json())
      .then(data => {
        console.log('Orders API Response:', data);
        setExpensesData(data);
      });
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Pagination API Test</h1>
      
      <div className="space-y-8">
        {/* Books Test */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Books API Test</h2>
          {booksData ? (
            <div>
              <p className="text-green-600 font-semibold mb-2">✓ API Working!</p>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(booksData, null, 2)}
              </pre>
              <div className="mt-4 p-4 bg-blue-50 rounded">
                <p><strong>Items returned:</strong> {booksData.data?.length || 0}</p>
                <p><strong>Total count:</strong> {booksData.pagination?.totalCount || 0}</p>
                <p><strong>Current page:</strong> {booksData.pagination?.currentPage || 0}</p>
                <p><strong>Total pages:</strong> {booksData.pagination?.totalPages || 0}</p>
              </div>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        {/* Orders Test */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Orders API Test</h2>
          {ordersData ? (
            <div>
              <p className="text-green-600 font-semibold mb-2">✓ API Working!</p>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(ordersData, null, 2)}
              </pre>
              <div className="mt-4 p-4 bg-blue-50 rounded">
                <p><strong>Items returned:</strong> {ordersData.data?.length || 0}</p>
                <p><strong>Total count:</strong> {ordersData.pagination?.totalCount || 0}</p>
                <p><strong>Current page:</strong> {ordersData.pagination?.currentPage || 0}</p>
                <p><strong>Total pages:</strong> {ordersData.pagination?.totalPages || 0}</p>
              </div>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        {/* Expenses Test */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Expenses API Test</h2>
          {expensesData ? (
            <div>
              <p className="text-green-600 font-semibold mb-2">✓ API Working!</p>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(expensesData, null, 2)}
              </pre>
              <div className="mt-4 p-4 bg-blue-50 rounded">
                <p><strong>Items returned:</strong> {expensesData.data?.length || 0}</p>
                <p><strong>Total count:</strong> {expensesData.pagination?.totalCount || 0}</p>
                <p><strong>Current page:</strong> {expensesData.pagination?.currentPage || 0}</p>
                <p><strong>Total pages:</strong> {expensesData.pagination?.totalPages || 0}</p>
              </div>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-lg mb-2">How to Verify Pagination:</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check the console (F12) for logged API responses</li>
          <li>Verify that "Items returned" matches the limit (5 in this test)</li>
          <li>Check that "Total count" shows the actual total records in DB</li>
          <li>Confirm "Total pages" is calculated correctly (totalCount / limit)</li>
          <li>Open Network tab and see the API calls with ?page=1&limit=5 parameters</li>
        </ol>
      </div>
    </div>
  );
}
