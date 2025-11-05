// const express = require("express");
// const Expense = require("../models/subAdminExpenses");

// const router = express.Router();

// // Add a new expense
// router.post("/", async (req, res) => {
//   try {
//     const { type, amount, driver, cabNumber } = req.body;
//     const newExpense = new Expense({ type, amount, driver, cabNumber });
//     await newExpense.save();
//     res.status(201).json(newExpense);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get all expenses
// router.get("/", async (req, res) => {
//   try {
//     const expenses = await Expense.find();
//     res.json(expenses);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Delete an expense
// router.delete("/:id", async (req, res) => {
//   try {
//     await Expense.findByIdAndDelete(req.params.id);
//     res.json({ message: "Expense deleted" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// router.put("/:id", async (req, res) => {
//   try {
//     const { type, amount, driver, cabNumber } = req.body;

//     console.log("iN Put Backend")
//     const updatedExpense = await Expense.findByIdAndUpdate(
//       req.params.id,
//       { type, amount, driver, cabNumber },
//       { new: true, runValidators: true }
//     );

//     if (!updatedExpense) {
//       return res.status(404).json({ message: "Expense not found" });
//     }

//     res.json(updatedExpense);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router;



const express = require("express");
const Expense = require("../models/subAdminExpenses");

const router = express.Router();

// Add a new expense
// router.post("/", async (req, res) => {
//   try {
//     const { type, amount, driver, cabNumber } = req.body;
//     const newExpense = new Expense({ type, amount, driver, cabNumber });
//     await newExpense.save();
//     res.status(201).json(newExpense);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

router.post("/", async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;
    const newExpense = await Expense.create({ type, amount, driver, cabNumber });
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all expenses
// router.get("/", async (req, res) => {
//   try {
//     const expenses = await Expense.find();
//     res.json(expenses);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

router.get("/", async (req, res) => {
  try {
    // Fetch all expenses from PostgreSQL
    const expenses = await Expense.findAll(); // Sequelize equivalent of find()

    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ message: error.message });
  }
});


// Delete an expense
// router.delete("/:id", async (req, res) => {
//   try {
//     await Expense.findByIdAndDelete(req.params.id);
//     res.json({ message: "Expense deleted" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

router.delete("/:id", async (req, res) => {
  try {
    await Expense.destroy({ where: { id: req.params.id } });
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// router.put("/:id", async (req, res) => {
//   try {
//     const { type, amount, driver, cabNumber } = req.body;

//     console.log("iN Put Backend")
//     const updatedExpense = await Expense.findByIdAndUpdate(
//       req.params.id,
//       { type, amount, driver, cabNumber },
//       { new: true, runValidators: true }
//     );

//     if (!updatedExpense) {
//       return res.status(404).json({ message: "Expense not found" });
//     }

//     res.json(updatedExpense);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });


router.put("/:id", async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;

    const [updatedRows] = await Expense.update(
      { type, amount, driver, cabNumber },
      {
        where: { id: req.params.id },
        returning: true, 
      }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const updatedExpense = await Expense.findByPk(req.params.id);

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;