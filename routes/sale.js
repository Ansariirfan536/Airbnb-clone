const express = require("express");
const router = express.Router();
const Sale = require("../models/sale.js");
const Listing = require("../models/listing.js");

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in first!");
        return res.redirect("/login");
    }
    next();
};

// Render Sale Form
router.get("/new", isLoggedIn, async (req, res) => {
    try {
        let listings;
        const isAdmin = req.user.role === "admin" || req.user.isAdmin === true;
        if (isAdmin) {
            listings = await Listing.find({});
        } else {
            listings = await Listing.find({ owner: req.user._id });
        }
        res.render("admin/new-sale.ejs", { listings });
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong!");
        res.redirect("/listings");
    }
});

// Handle Sale Creation & Permission Check
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const { listingId, discountType, discountValue, saleStartDateTime, saleDurationHours } = req.body;
        const isAdmin = req.user.role === "admin" || req.user.isAdmin === true;

        // Agar user "all" select kare lekin woh admin nahi hai, toh turant block karo
        if (listingId === "all" && !isAdmin) {
            req.flash("error", "Only Admin can apply sale to all listings!");
            return res.redirect("/listings");
        }

        if (listingId && listingId !== "all") {
            const listing = await Listing.findById(listingId);
            if (!listing) {
                req.flash("error", "Listing not found!");
                return res.redirect("/listings");
            }

            // Safe ID comparison (handling Mongoose ObjectId vs String mismatch)
            const listingOwnerId = listing.owner ? listing.owner.toString() : "";
            const currentUserId = req.user._id ? req.user._id.toString() : "";
            const isOwner = listingOwnerId === currentUserId;

            if (!isAdmin && !isOwner) {
                req.flash("error", "You do not have permission to apply sale on this listing!");
                return res.redirect("/listings");
            }

            await Sale.deleteMany({ listing: listingId });
            const newSale = new Sale({
                listing: listingId,
                discountType,
                discountValue,
                saleStartDateTime: saleStartDateTime ? new Date(saleStartDateTime) : new Date(),
                saleDurationHours: Number(saleDurationHours)
            });
            await newSale.save();
        } 
        else if (listingId === "all") {
            if (!isAdmin) {
                req.flash("error", "Only Admin can apply sale to all listings!");
                return res.redirect("/listings");
            }

            const allListings = await Listing.find({});
            await Sale.deleteMany({});
            
            for (let listing of allListings) {
                const newSale = new Sale({
                    listing: listing._id,
                    discountType,
                    discountValue,
                    saleStartDateTime: saleStartDateTime ? new Date(saleStartDateTime) : new Date(),
                    saleDurationHours: Number(saleDurationHours)
                });
                await newSale.save();
            }
        }

        req.flash("success", "Sale successfully applied!");
        res.redirect("/listings");
    } catch (err) {
        console.error("Sale Error:", err);
        req.flash("error", "Failed to apply sale.");
        res.redirect("/listings");
    }
});

module.exports = router;