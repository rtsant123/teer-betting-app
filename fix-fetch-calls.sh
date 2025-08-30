#!/bin/bash
#
# Script to replace hardcoded fetch calls with centralized API calls
#

echo "🔄 Replacing hardcoded fetch calls in AdminDashboard.jsx..."

FILE="/workspaces/teer-betting-app/frontend/src/pages/AdminDashboard.jsx"

# Replace fetch calls with apiPost/apiPut
sed -i "s|const response = await fetch('/api/v1/admin/schedule/update-statuses', {|const response = await apiPost('/admin/schedule/update-statuses');|g" "$FILE"
sed -i "s|const response = await fetch('/api/v1/admin/users?limit=100', {|const response = await apiGet('/admin/users?limit=100');|g" "$FILE"
sed -i "s|const response = await fetch('/api/v1/admin/users/create-admin', {|const response = await apiPost('/admin/users/create-admin', newAdmin);|g" "$FILE"
sed -i "s|const response = await fetch('/api/v1/admin/tasks/all', {|const response = await apiGet('/admin/tasks/all');|g" "$FILE"
sed -i "s|const response = await fetch('/api/v1/admin/tasks/my-tasks', {|const response = await apiGet('/admin/tasks/my-tasks');|g" "$FILE"
sed -i "s|const response = await fetch('/api/v1/admin/tasks/assign', {|const response = await apiPost('/admin/tasks/assign', { task_id: taskId, assigned_to: adminId });|g" "$FILE"

echo "✅ Fetch calls replaced!"
echo "⚠️  Note: Manual review may be needed for method bodies and error handling"
