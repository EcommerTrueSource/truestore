"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import type { CartItem } from "@/types/cart"
import { fetchCartItems } from "@/lib/api"

export default function CheckoutSummary() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getCartItems = async () => {
      try {
        const data = await fetchCartItems()
        setCartItems(data)
      } catch (error) {
        console.error("Failed to fetch cart items:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getCartItems()
  }, [])

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 0 // Free shipping
  const total = subtotal + shipping

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="w-2/3 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="sticky top-20">
        <CardHeader>
          <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}

          <Separator />

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Frete</span>
            <span className="font-medium text-green-600">Grátis</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-pink-600">{formatCurrency(total)}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full bg-pink-600 hover:bg-pink-700">Finalizar Compra</Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
