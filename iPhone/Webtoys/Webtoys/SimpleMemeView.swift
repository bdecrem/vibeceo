import SwiftUI

struct SimpleMemeView: View {
    @State private var topText = ""
    @State private var bottomText = ""
    @State private var selectedTemplate = 0
    @Environment(\.dismiss) private var dismiss
    
    let memeTemplates = [
        MemeTemplate(name: "Drake", emoji: "🤷‍♂️", topColor: .red, bottomColor: .green),
        MemeTemplate(name: "Galaxy Brain", emoji: "🧠", topColor: .purple, bottomColor: .pink)
    ]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Meme Generator")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.top)
                
                // Template Picker
                HStack(spacing: 12) {
                    ForEach(0..<memeTemplates.count, id: \.self) { index in
                        TemplateCard(
                            template: memeTemplates[index],
                            isSelected: selectedTemplate == index
                        ) {
                            selectedTemplate = index
                        }
                    }
                }
                
                // Meme Preview
                MemePreview(
                    template: memeTemplates[selectedTemplate],
                    topText: topText.isEmpty ? "TOP TEXT" : topText,
                    bottomText: bottomText.isEmpty ? "BOTTOM TEXT" : bottomText
                )
                .frame(height: 300)
                .padding(.horizontal, 20)
                
                // Text Inputs
                VStack(spacing: 12) {
                    TextField("Top text", text: $topText)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    TextField("Bottom text", text: $bottomText)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }
                .padding(.horizontal, 20)
                
                Spacer()
                
                Button("Done") {
                    dismiss()
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
            .navigationBarHidden(true)
        }
    }
}

struct MemeTemplate {
    let name: String
    let emoji: String
    let topColor: Color
    let bottomColor: Color
}

struct TemplateCard: View {
    let template: MemeTemplate
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    LinearGradient(
                        colors: [template.topColor, template.bottomColor],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(width: 60, height: 60)
                    .cornerRadius(12)
                    
                    Text(template.emoji)
                        .font(.title)
                }
                
                Text(template.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3), value: isSelected)
        }
    }
}

struct MemePreview: View {
    let template: MemeTemplate
    let topText: String
    let bottomText: String
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [template.topColor, template.bottomColor],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .cornerRadius(16)
            
            VStack {
                Spacer()
                
                Text(topText)
                    .font(.title2)
                    .fontWeight(.black)
                    .foregroundColor(.white)
                    .shadow(color: .black, radius: 2, x: 2, y: 2)
                    .multilineTextAlignment(.center)
                
                Spacer()
                
                Text(template.emoji)
                    .font(.system(size: 80))
                
                Spacer()
                
                Text(bottomText)
                    .font(.title2)
                    .fontWeight(.black)
                    .foregroundColor(.white)
                    .shadow(color: .black, radius: 2, x: 2, y: 2)
                    .multilineTextAlignment(.center)
                
                Spacer()
            }
            .padding()
        }
    }
}