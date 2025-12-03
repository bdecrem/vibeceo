import SwiftUI

struct ProfileView: View {
    @StateObject private var store = WebtToyStore.shared
    @State private var isEditMode = false
    @State private var selectedForDeletion: Set<UUID> = []
    
    var userCreatedApps: [WebtToy] {
        store.webtoys.filter { $0.creator == "You" }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    // Profile Avatar
                    ZStack {
                        Circle()
                            .fill(LinearGradient(
                                colors: [Color.blue, Color.purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ))
                            .frame(width: 80, height: 80)
                        
                        Text("You")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }
                    
                    VStack(spacing: 4) {
                        Text("Your Profile")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("\(userCreatedApps.count) apps created")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 20)
                .padding(.horizontal)
                
                // Apps List
                if userCreatedApps.isEmpty {
                    // Empty State
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "app.badge.plus")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary.opacity(0.6))
                        
                        VStack(spacing: 8) {
                            Text("No apps yet!")
                                .font(.title3)
                                .fontWeight(.semibold)
                            
                            Text("Tap the + button to create your first WebtToy")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, 40)
                    Spacer()
                } else {
                    // Apps List Header
                    HStack {
                        Text("Your Apps")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        if !userCreatedApps.isEmpty {
                            Button(isEditMode ? "Done" : "Edit") {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    isEditMode.toggle()
                                    if !isEditMode {
                                        selectedForDeletion.removeAll()
                                    }
                                }
                            }
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 24)
                    
                    // Delete Actions (shown when in edit mode)
                    if isEditMode && !selectedForDeletion.isEmpty {
                        HStack {
                            Button("Delete Selected (\(selectedForDeletion.count))") {
                                deleteSelectedApps()
                            }
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.red)
                            .cornerRadius(8)
                            
                            Spacer()
                        }
                        .padding(.horizontal)
                        .padding(.top, 8)
                    }
                    
                    // Apps Grid
                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12)
                        ], spacing: 16) {
                            ForEach(userCreatedApps) { app in
                                AppCard(
                                    app: app,
                                    isEditMode: isEditMode,
                                    isSelected: selectedForDeletion.contains(app.id),
                                    onSelectionToggle: {
                                        toggleSelection(for: app.id)
                                    }
                                )
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 16)
                        .padding(.bottom, 100) // Space for tab bar
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }
    
    private func toggleSelection(for id: UUID) {
        if selectedForDeletion.contains(id) {
            selectedForDeletion.remove(id)
        } else {
            selectedForDeletion.insert(id)
        }
    }
    
    private func deleteSelectedApps() {
        let appsToDelete = userCreatedApps.filter { selectedForDeletion.contains($0.id) }
        
        withAnimation(.easeInOut(duration: 0.3)) {
            for app in appsToDelete {
                store.removeWebtToy(app)
            }
            selectedForDeletion.removeAll()
            
            // Exit edit mode if no apps remain
            if userCreatedApps.isEmpty {
                isEditMode = false
            }
        }
    }
}

struct AppCard: View {
    let app: WebtToy
    let isEditMode: Bool
    let isSelected: Bool
    let onSelectionToggle: () -> Void
    
    var body: some View {
        ZStack {
            // Main Card
            VStack(alignment: .leading, spacing: 12) {
                // App Preview Area
                RoundedRectangle(cornerRadius: 12)
                    .fill(LinearGradient(
                        colors: [Color.blue.opacity(0.8), Color.purple.opacity(0.6)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(height: 120)
                    .overlay(
                        VStack {
                            Image(systemName: app.type.iconName)
                                .font(.system(size: 32, weight: .medium))
                                .foregroundColor(.white.opacity(0.9))
                            
                            Text(app.type.displayName)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    )
                
                // App Info
                VStack(alignment: .leading, spacing: 6) {
                    Text(app.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    Text(app.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    Text(formatDate(app.createdAt))
                        .font(.caption2)
                        .foregroundColor(.secondary.opacity(0.8))
                }
                .padding(.horizontal, 4)
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            )
            .scaleEffect(isSelected ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isSelected)
            
            // Selection Checkbox (Edit Mode)
            if isEditMode {
                VStack {
                    HStack {
                        Spacer()
                        
                        Button(action: onSelectionToggle) {
                            ZStack {
                                Circle()
                                    .fill(isSelected ? Color.red : Color.gray.opacity(0.3))
                                    .frame(width: 24, height: 24)
                                
                                if isSelected {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .animation(.easeInOut(duration: 0.2), value: isSelected)
                    }
                    
                    Spacer()
                }
                .padding(8)
            }
        }
        .onTapGesture {
            if isEditMode {
                onSelectionToggle()
            }
            // TODO: Add navigation to app detail view
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
    }
}