/* eslint-disable indent */
/* eslint-disable operator-linebreak */
/* eslint-disable max-len */
import {Sequelize, Op} from "sequelize";
import dbUsers from "../models/users.js";
import dbVendors from "../models/vendors.js";

const calculateDistance = (userLat, userLng, vendorLat, vendorLng) => {
    const R = 6371; // Earth radius in kilometers
    const dLat = (vendorLat - userLat) * (Math.PI / 180);
    const dLng = (vendorLng - userLng) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLat * (Math.PI / 180)) * Math.cos(vendorLat * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;

    distance = Math.round(distance * 100) / 100;
    let unit = "KM";

    if (distance < 1) {
        distance = Math.round(distance * 1000);
        unit = "Meter";
    }

    return `${distance} ${unit}`;
};

export const getVendors = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 10;
        const location = parseInt(req.query.location) || 0;
        const showNull = parseInt(req.query.null) || 0;
        const userLat = parseFloat(req.query.latitude);
        const userLng = parseFloat(req.query.longitude);
        const filter = req.query.filter;
        const searchQuery = req.query.search;

        const offset = (page - 1) * size;

        if (page < 0) {
            return res.status(400).json({
                error: true,
                message: "Invalid value parameter page",
            });
        }

        if (size < 0) {
            return res.status(400).json({
                error: true,
                message: "Invalid value parameter size",
            });
        }

        if (location !== 1 && location !== 0) {
            return res.status(400).json({
                error: true,
                message: "Invalid value parameter location",
            });
        }

        if (showNull !== 1 && showNull !== 0) {
            return res.status(400).json({
                error: true,
                message: "Invalid value parameter showNull",
            });
        }

        if (filter && !["name", "minPrice", "maxPrice", "nearby"].includes(filter)) {
            return res.status(400).json({
                error: true,
                message: "Invalid value parameter filter",
            });
        }

        if (filter === "nearby") {
            if (location !== 1) {
                return res.status(400).json({
                    error: true,
                    message: "Value parameter location required and must be 1 when filter is 'nearby'",
                });
            }
            if (!userLat && !userLng) {
                return res.status(400).json({
                    error: true,
                    message: "Value parameter latitude and longitude required",
                });
            }
            if (!userLat) {
                return res.status(400).json({
                    error: true,
                    message: "Value parameter latitude required",
                });
            }
            if (!userLng) {
                return res.status(400).json({
                    error: true,
                    message: "Value parameter longitude required",
                });
            }
        }

        if (searchQuery && searchQuery.length < 2) {
            return res.status(400).json({
                error: true,
                message: "Search query must be at least 2 characters long",
            });
        }

        const orderQuery =
            filter === "name"
                ? [["nameVendor", "ASC"]]
                : filter === "minPrice"
                ? [["minPrice", "ASC"]]
                : filter === "maxPrice"
                ? [["maxPrice", "DESC"]]
                : filter === "nearby" && userLat && userLng
                ? [
                    [
                        dbUsers.sequelize.literal(`(
                            6371 * acos(
                                cos(radians(${userLat})) * cos(radians(\`user\`.\`latitude\`)) * cos(radians(\`user\`.\`longitude\`) - radians(${userLng})) +
                                sin(radians(${userLat})) * sin(radians(\`user\`.\`latitude\`))
                            )
                        )`),
                        "ASC",
                    ],
                ]
                : [];

        const searchCondition = searchQuery
        ? {
            [Op.or]: [
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("nameVendor")), "LIKE", `%${searchQuery.toLowerCase()}%`),
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("products")), "LIKE", `%${searchQuery.toLowerCase()}%`),
            ],
        }
        : {};

        const vendorsNotNullLocation = await dbVendors.findAll({
            include: [
                {
                    model: dbUsers,
                    attributes: ["imageUrl", "name", "noHp", ...(location === 1 ? ["latitude", "longitude"] : [])],
                },
            ],
            order: orderQuery,
            where: {
                ...searchCondition,
                "$user.latitude$": {[Op.not]: null},
                "$user.longitude$": {[Op.not]: null},
            },
        });

        const vendorsWithNullLocation = await dbVendors.findAll({
            include: [
                {
                    model: dbUsers,
                    attributes: ["imageUrl", "name", "noHp", ...(location === 1 ? ["latitude", "longitude"] : [])],
                },
            ],
            order: orderQuery,
            where: {
                ...searchCondition,
                [Op.or]: [
                    {"$user.latitude$": null},
                    {"$user.longitude$": null},
                ],
            },
        });

        const vendors = vendorsNotNullLocation.concat(vendorsWithNullLocation);

        const totalPages = Math.ceil(vendors.length / size);

        let formattedVendors = vendors.slice(offset, offset + size)
            .map((vendor) => {
                if (vendor) {
                    if (filter === "nearby") {
                        const distance = userLat && userLng && vendor.user.latitude !== null && vendor.user.latitude !== null
                            ? calculateDistance(userLat, userLng, vendor.user.latitude, vendor.user.longitude)
                            : null;

                        if (showNull === 1 || (showNull === 0 && distance !== null)) {
                            return {
                                vendorId: vendor.vendorId,
                                userId: vendor.userId,
                                imageUrl: vendor.user.imageUrl,
                                name: vendor.user.name,
                                nameVendor: vendor.nameVendor,
                                noHp: vendor.user.noHp,
                                products: vendor.products,
                                minPrice: vendor.minPrice,
                                maxPrice: vendor.maxPrice,
                                latitude: vendor.user.latitude,
                                longitude: vendor.user.longitude,
                                distance: distance,
                            };
                        }
                    } else {
                        const shouldInclude = (showNull === 0 && vendor.user.latitude !== null && vendor.user.longitude !== null) || (showNull === 1);
                        if (shouldInclude) {
                            return {
                                vendorId: vendor.vendorId,
                                userId: vendor.userId,
                                imageUrl: vendor.user.imageUrl,
                                name: vendor.user.name,
                                nameVendor: vendor.nameVendor,
                                noHp: vendor.user.noHp,
                                products: vendor.products,
                                minPrice: vendor.minPrice,
                                maxPrice: vendor.maxPrice,
                                latitude: vendor.user.latitude,
                                longitude: vendor.user.longitude,
                            };
                        }
                    }
                }
            })
            .filter((vendor) => vendor !== undefined);

        if (filter === "name") {
            formattedVendors = formattedVendors.sort((a, b) => {
                const aName = a.nameVendor || "";
                const bName = b.nameVendor || "";

                if (aName === "" && bName !== "") return 1;
                if (aName !== "" && bName === "") return -1;

                return aName.localeCompare(bName);
            });
        }

        if (filter === "minPrice") {
            formattedVendors = formattedVendors.sort((a, b) => {
                if (a.minPrice === null && b.minPrice !== null) return 1;
                if (a.minPrice !== null && b.minPrice === null) return -1;
                return a.minPrice - b.minPrice;
            });
        }

        if (location === 1 && showNull === 1) {
            formattedVendors = formattedVendors.sort((a, b) => {
                const aLocationNull = a.latitude === null || a.longitude === null;
                const bLocationNull = b.latitude === null || b.longitude === null;

                if (aLocationNull && !bLocationNull) return 1;
                if (!aLocationNull && bLocationNull) return -1;

                return 0;
            });
        }

        if (filter === "nearby") {
            formattedVendors.sort((a, b) => (a.distance === null && b.distance !== null ? 1 : a.distance !== null && b.distance === null ? -1 : 0));
        }

        res.json({
            error: false,
            message: "Vendors fetched successfully",
            listVendors: formattedVendors,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (err) {
        console.error("[ERROR]", err);
        res.status(500).json({
            error: true,
            message: "Internal Server Error",
            errorMessage: err.message,
        });
    }
};
