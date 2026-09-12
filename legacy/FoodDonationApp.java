import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;

public class FoodDonationApp {
    static class FoodDonation {
        String donorName;
        String foodItem;
        int quantity;
        boolean delivered;
        Date donationDate;
        Date expiryDate;

        FoodDonation(String donorName, String foodItem, int quantity, Date donationDate, Date expiryDate) {
            this.donorName = donorName;
            this.foodItem = foodItem;
            this.quantity = quantity;
            this.delivered = false;
            this.donationDate = donationDate;
            this.expiryDate = expiryDate;
        }

        @Override
        public String toString() {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
            return "Donor: " + donorName + ", Food Item: " + foodItem + ", Quantity: " + quantity +
                    ", Delivered: " + (delivered ? "Yes" : "No") + ", Donation Date: " + sdf.format(donationDate) +
                    ", Expiry Date: " + sdf.format(expiryDate);
        }
    }

    static class FoodRecipient {
        String recipientName;
        String need;
        ArrayList<String> additionalNeeds;

        FoodRecipient(String recipientName, String need) {
            this.recipientName = recipientName;
            this.need = need;
            this.additionalNeeds = new ArrayList<>();
        }

        @Override
        public String toString() {
            return "Recipient: " + recipientName + ", Primary Need: " + need + ", Additional Needs: " + additionalNeeds;
        }
    }

    static class Restaurant {
        String restaurantName;
        String contact;
        String foodItem;
        int quantity;
        ArrayList<FoodDonation> donationHistory;

        Restaurant(String restaurantName, String contact, String foodItem, int quantity) {
            this.restaurantName = restaurantName;
            this.contact = contact;
            this.foodItem = foodItem;
            this.quantity = quantity;
            this.donationHistory = new ArrayList<>();
        }

        @Override
        public String toString() {
            return "Restaurant: " + restaurantName + ", Contact: " + contact + ", Food Item: " + foodItem +
                    ", Quantity: " + quantity;
        }
    }

    private final ArrayList<FoodDonation> donations = new ArrayList<>();
    private final ArrayList<FoodRecipient> recipients = new ArrayList<>();
    private final ArrayList<Restaurant> restaurants = new ArrayList<>();
    private JFrame frame;

    // Method to initialize the login screen
    private void initLoginScreen() {
        frame = new JFrame("Food Donation System - Login");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(400, 300);

        // Panel for login form
        JPanel panel = new JPanel();
        panel.setLayout(new GridLayout(3, 2, 10, 10));

        JLabel userLabel = new JLabel("Username:");
        JTextField usernameField = new JTextField();
        JLabel passLabel = new JLabel("Password:");
        JPasswordField passwordField = new JPasswordField();
        JButton loginButton = new JButton("Login");

        panel.add(userLabel);
        panel.add(usernameField);
        panel.add(passLabel);
        panel.add(passwordField);
        panel.add(new JLabel());
        panel.add(loginButton);

        frame.add(panel);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);

        // Login button action
        loginButton.addActionListener(e -> {
            String username = usernameField.getText();
            String password = new String(passwordField.getPassword());

            if (username.equals("admin") && password.equals("admin")) {
                JOptionPane.showMessageDialog(frame, "Login successful!");
                frame.dispose();
                initMainDashboard();
            } else {
                JOptionPane.showMessageDialog(frame, "Invalid credentials. Try again.");
            }
        });
    }

    // Method to initialize the main dashboard
    private void initMainDashboard() {
        frame = new JFrame("Food Donation System - Dashboard");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(600, 400);

        // Panel for main options
        JPanel panel = new JPanel();
        panel.setLayout(new GridLayout(10, 1, 10, 10));

        JButton addDonationButton = new JButton("Add Food Donation");
        JButton registerRecipientButton = new JButton("Register Recipient");
        JButton viewDonationsButton = new JButton("View Donations");
        JButton viewRecipientsButton = new JButton("View Recipients");
        JButton registerRestaurantButton = new JButton("Register Restaurant");
        JButton viewRestaurantsButton = new JButton("View Restaurants");
        JButton deliverFoodButton = new JButton("Deliver Food");
        JButton sortDonationsButton = new JButton("Sort Donations by Quantity");
        JButton searchDonationsButton = new JButton("Search Donations");
        JButton logoutButton = new JButton("Logout");

        panel.add(addDonationButton);
        panel.add(registerRecipientButton);
        panel.add(viewDonationsButton);
        panel.add(viewRecipientsButton);
        panel.add(registerRestaurantButton);
        panel.add(viewRestaurantsButton);
        panel.add(deliverFoodButton);
        panel.add(sortDonationsButton);
        panel.add(searchDonationsButton);
        panel.add(logoutButton);

        frame.add(panel);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);

        // Action listeners for buttons
        addDonationButton.addActionListener(e -> {
            try {
                addFoodDonation();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "Error: " + ex.getMessage());
            }
        });
        registerRecipientButton.addActionListener(e -> {
            try {
                // Create input dialog for recipient details
                String name = JOptionPane.showInputDialog(frame, "Enter recipient name:");
                String contact = JOptionPane.showInputDialog(frame, "Enter recipient contact number:");
                String address = JOptionPane.showInputDialog(frame, "Enter recipient address:");
                if (name != null && contact != null && address != null && 
                    !name.trim().isEmpty() && !contact.trim().isEmpty() && !address.trim().isEmpty()) {
                    // Validate contact number format
                    if (!contact.matches("\\d{10}")) {
                        JOptionPane.showMessageDialog(frame, "Please enter a valid 10-digit contact number");
                        return;
                    }
                    
                    // Create new recipient
                    FoodRecipient recipient = new FoodRecipient(name.trim(), contact.trim());
                    recipients.add(recipient);
                    JOptionPane.showMessageDialog(frame, "Recipient registered successfully!");
                } else {
                    JOptionPane.showMessageDialog(frame, "Please fill in all fields");
                }
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "Error: " + ex.getMessage());
            }
        });
        viewDonationsButton.addActionListener(e -> {
            try {
                StringBuilder donationsList = new StringBuilder("Current Donations:\n");
                for (FoodDonation donation : donations) {
                    donationsList.append(donation).append("\n");
                }
                if (donations.isEmpty()) {
                    donationsList.append("No donations available.");
                }
                JOptionPane.showMessageDialog(frame, donationsList.toString());
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "Error: " + ex.getMessage());
            }
        });
        viewRecipientsButton.addActionListener(e -> {
            try {
                StringBuilder recipientsList = new StringBuilder("Current Recipients:\n");
                for (FoodRecipient recipient : recipients) {
                    recipientsList.append(recipient).append("\n");
                }
                if (recipients.isEmpty()) {
                    recipientsList.append("No recipients registered.");
                }
                JOptionPane.showMessageDialog(frame, recipientsList.toString());
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "Error: " + ex.getMessage());
            }
        });
        registerRestaurantButton.addActionListener(e -> {
            try {
                registerRestaurant();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "Error: " + ex.getMessage());
            }
        });
        viewRestaurantsButton.addActionListener(e -> {
            try {
                viewRestaurants();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "Error: " + ex.getMessage());
            }
        });
        deliverFoodButton.addActionListener(e -> deliverFood());
        sortDonationsButton.addActionListener(e -> sortDonations());
        searchDonationsButton.addActionListener(e -> searchDonations());
        logoutButton.addActionListener(e -> logout());
    }

    // Enhanced feature methods
    private void searchDonations() {
        String searchQuery = JOptionPane.showInputDialog(frame, "Enter donor name or food item to search:");

        if (searchQuery != null && !searchQuery.isEmpty()) {
            StringBuilder searchResults = new StringBuilder("Search Results:\n");
            for (FoodDonation donation : donations) {
                if (donation.donorName.toLowerCase().contains(searchQuery.toLowerCase()) || 
                    donation.foodItem.toLowerCase().contains(searchQuery.toLowerCase())) {
                    searchResults.append(donation).append("\n");
                }
            }

            if (searchResults.length() == 0) {
                searchResults.append("No results found.");
            }
            JOptionPane.showMessageDialog(frame, searchResults.toString());
        }
    }

    private void sortDonations() {
        donations.sort(Comparator.comparingInt(d -> d.quantity));
        JOptionPane.showMessageDialog(frame, "Donations sorted by quantity.");
    }

    private void logout() {
        int choice = JOptionPane.showConfirmDialog(frame, "Are you sure you want to log out?", "Logout", JOptionPane.YES_NO_OPTION);
        if (choice == JOptionPane.YES_OPTION) {
            frame.dispose();
            initLoginScreen();
        }
    }

    private void addFoodDonation() throws Exception {
        String donorName = JOptionPane.showInputDialog(frame, "Enter donor name:");
        String foodItem = JOptionPane.showInputDialog(frame, "Enter food item:");
        String quantityStr = JOptionPane.showInputDialog(frame, "Enter quantity:");
        String expiryDateStr = JOptionPane.showInputDialog(frame, "Enter expiry date (yyyy-MM-dd):");

        if (donorName != null && foodItem != null && quantityStr != null && expiryDateStr != null &&
            !donorName.trim().isEmpty() && !foodItem.trim().isEmpty() && !quantityStr.trim().isEmpty()) {
            try {
                int quantity = Integer.parseInt(quantityStr);
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
                Date donationDate = new Date(); // Current date
                Date expiryDate = sdf.parse(expiryDateStr);
                
                if (expiryDate.before(donationDate)) {
                    JOptionPane.showMessageDialog(frame, "Expiry date cannot be before donation date.");
                    return;
                }

                donations.add(new FoodDonation(donorName.trim(), foodItem.trim(), quantity, donationDate, expiryDate));
                JOptionPane.showMessageDialog(frame, "Food donation added successfully!");
            } catch (Exception e) {
                throw new Exception("Invalid input. Please check the details.");
            }
        } else {
            JOptionPane.showMessageDialog(frame, "Please fill in all fields.");
        }
    }

    private void registerRestaurant() {
        String restaurantName = JOptionPane.showInputDialog(frame, "Enter Restaurant Name:");
        String contact = JOptionPane.showInputDialog(frame, "Enter Restaurant Contact:");
        String foodItem = JOptionPane.showInputDialog(frame, "Enter Food Item:");
        String quantityStr = JOptionPane.showInputDialog(frame, "Enter Quantity:");

        try {
            int quantity = Integer.parseInt(quantityStr);
            restaurants.add(new Restaurant(restaurantName, contact, foodItem, quantity));
            JOptionPane.showMessageDialog(frame, "Restaurant registered successfully!");
        } catch (Exception e) {
            JOptionPane.showMessageDialog(frame, "Invalid input. Please check the details.");
        }
    }

    private void viewRestaurants() {
        StringBuilder restaurantsList = new StringBuilder("Registered Restaurants:\n");
        for (Restaurant restaurant : restaurants) {
            restaurantsList.append(restaurant).append("\n");
        }
        if (restaurants.isEmpty()) {
            restaurantsList.append("No restaurants registered.");
        }
        JOptionPane.showMessageDialog(frame, restaurantsList.toString());
    }

    private void deliverFood() {
        JOptionPane.showMessageDialog(frame, "Food has been delivered successfully!");
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            FoodDonationApp app = new FoodDonationApp();
            app.initLoginScreen();
        });
    }
}
